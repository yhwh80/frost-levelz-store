package com.frostlevelz.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Keeps WebView audio alive when the app is backgrounded, and puts the track on
 * the lock screen.
 *
 * Playback itself stays in the WebView's HTMLAudioElement — this service does not
 * decode anything. Its two jobs are:
 *
 *   1. Be a foreground service, so Android stops killing the process the moment
 *      the user leaves the app. Without this, audio dies under memory pressure.
 *   2. Own a MediaSession, which is what surfaces lock-screen / notification
 *      controls and lets headphones and car stereos drive playback.
 *
 * Transport buttons are routed back to JavaScript, which calls play()/pause() on
 * the same <audio> element the UI uses — so the notification and the in-app
 * controls can never disagree about state.
 *
 * The iOS equivalent is UIBackgroundModes:audio + an AVAudioSession playback
 * category; Android needs considerably more scaffolding for the same result.
 */
public class BackgroundAudioService extends Service {

    private static final String TAG = "FLBackgroundAudio";

    public static final String ACTION_START = "com.frostlevelz.app.action.START";
    public static final String ACTION_UPDATE = "com.frostlevelz.app.action.UPDATE";
    public static final String ACTION_STOP = "com.frostlevelz.app.action.STOP";

    public static final String REMOTE_PLAY = "com.frostlevelz.app.remote.PLAY";
    public static final String REMOTE_PAUSE = "com.frostlevelz.app.remote.PAUSE";
    public static final String REMOTE_NEXT = "com.frostlevelz.app.remote.NEXT";
    public static final String REMOTE_PREV = "com.frostlevelz.app.remote.PREV";
    public static final String REMOTE_STOP = "com.frostlevelz.app.remote.STOP";

    private static final String CHANNEL_ID = "frostlevelz_playback";
    private static final int NOTIFICATION_ID = 1821;

    /** Set by the plugin so transport events can reach the WebView. */
    @Nullable
    public static BackgroundAudioPlugin plugin;

    private MediaSessionCompat session;

    private String title = "Frost Levelz";
    private String artist = "Frost Levelz";
    private String album = "";
    private String artworkUrl = null;
    private Bitmap artwork = null;
    private boolean playing = false;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();

        // Without an explicit media-button receiver the session is registered but
        // deaf: headphone and car-stereo buttons never reach onPlay/onPause.
        ComponentName mediaButtonReceiver =
                new ComponentName(this, androidx.media.session.MediaButtonReceiver.class);
        session = new MediaSessionCompat(this, "FrostLevelzSession", mediaButtonReceiver, null);
        session.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
                | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() { emit("play"); }
            @Override public void onPause() { emit("pause"); }
            @Override public void onSkipToNext() { emit("next"); }
            @Override public void onSkipToPrevious() { emit("prev"); }
            @Override public void onStop() { emit("stop"); }
        });
        session.setActive(true);
    }

    // NOTE: this service deliberately does NOT request audio focus.
    //
    // Chromium already takes audio focus for the WebView's <audio> element, so a
    // second request from the same process fights it: our request immediately
    // loses focus, the listener emits "pause", and JS pauses the track roughly
    // 0.1s after it starts. That was a real bug - playback cut out instantly.
    //
    // The WebView also handles interruptions (calls, other media apps) for us,
    // so there is nothing to gain here. Do not re-add it.

    private void emit(String action) {
        BackgroundAudioPlugin p = plugin;
        if (p != null) {
            p.onRemoteCommand(action);
        } else {
            Log.w(TAG, "remote command '" + action + "' dropped: no plugin attached");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Hardware / headphone / car-stereo buttons arrive here as ACTION_MEDIA_BUTTON
        // and must be handed to the session, which turns them into onPlay/onPause.
        if (intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {
            androidx.media.session.MediaButtonReceiver.handleIntent(session, intent);
            return START_STICKY;
        }

        String action = intent != null ? intent.getAction() : null;
        if (action == null) action = ACTION_UPDATE;

        switch (action) {
            case REMOTE_PLAY:  emit("play");  return START_STICKY;
            case REMOTE_PAUSE: emit("pause"); return START_STICKY;
            case REMOTE_NEXT:  emit("next");  return START_STICKY;
            case REMOTE_PREV:  emit("prev");  return START_STICKY;
            case REMOTE_STOP:  emit("stop");  return START_STICKY;
            case ACTION_STOP:
                stopPlayback();
                return START_NOT_STICKY;
            default:
                break;
        }

        if (intent != null && intent.hasExtra("title")) {
            String newArtwork = intent.getStringExtra("artworkUrl");
            boolean artworkChanged = newArtwork != null && !newArtwork.equals(artworkUrl);

            title = orDefault(intent.getStringExtra("title"), title);
            artist = orDefault(intent.getStringExtra("artist"), artist);
            album = orDefault(intent.getStringExtra("album"), "");
            artworkUrl = newArtwork;

            if (artworkChanged) {
                artwork = null;
                fetchArtworkAsync(newArtwork);
            }
        }
        playing = intent == null || intent.getBooleanExtra("playing", true);

        // Must happen fast after startForegroundService(), or Android throws.
        startInForeground();
        updateSession();
        return START_STICKY;
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isEmpty() ? fallback : value;
    }

    private void startInForeground() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, buildNotification(),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, buildNotification());
            }
        } catch (Exception e) {
            // Most likely POST_NOTIFICATIONS was denied on Android 13+. Playback in the
            // foreground still works; we just lose background survival. Don't crash.
            Log.e(TAG, "startForeground failed - continuing without it", e);
        }
    }

    private void stopPlayback() {
        playing = false;
        if (session != null) {
            session.setActive(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    private void updateSession() {
        if (session == null) return;

        MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album);
        if (artwork != null) {
            meta.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork);
        }
        session.setMetadata(meta.build());

        session.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY
                        | PlaybackStateCompat.ACTION_PAUSE
                        | PlaybackStateCompat.ACTION_PLAY_PAUSE
                        | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                        | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                        | PlaybackStateCompat.ACTION_STOP)
                .setState(playing ? PlaybackStateCompat.STATE_PLAYING
                                  : PlaybackStateCompat.STATE_PAUSED,
                        PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f)
                .build());

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) {
            nm.notify(NOTIFICATION_ID, buildNotification());
        }
    }

    private PendingIntent serviceIntent(String action) {
        Intent i = new Intent(this, BackgroundAudioService.class).setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getService(this, action.hashCode(), i, flags);
    }

    private android.app.Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, open, flags);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(artist)
                .setSubText(album)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(contentIntent)
                .setDeleteIntent(serviceIntent(REMOTE_STOP))
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(playing)
                .setShowWhen(false);

        if (artwork != null) {
            b.setLargeIcon(artwork);
        }

        b.addAction(new NotificationCompat.Action(
                android.R.drawable.ic_media_previous, "Previous", serviceIntent(REMOTE_PREV)));
        if (playing) {
            b.addAction(new NotificationCompat.Action(
                    android.R.drawable.ic_media_pause, "Pause", serviceIntent(REMOTE_PAUSE)));
        } else {
            b.addAction(new NotificationCompat.Action(
                    android.R.drawable.ic_media_play, "Play", serviceIntent(REMOTE_PLAY)));
        }
        b.addAction(new NotificationCompat.Action(
                android.R.drawable.ic_media_next, "Next", serviceIntent(REMOTE_NEXT)));

        b.setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(session.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));

        return b.build();
    }

    /** Artwork is remote, so never touch the network on the main thread. */
    private void fetchArtworkAsync(final String url) {
        new Thread(() -> {
            Bitmap bmp = null;
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                try (InputStream in = conn.getInputStream()) {
                    bmp = BitmapFactory.decodeStream(in);
                }
            } catch (Exception e) {
                Log.w(TAG, "artwork fetch failed for " + url, e);
            } finally {
                if (conn != null) conn.disconnect();
            }
            if (bmp != null) {
                artwork = bmp;
                // Re-post so the lock screen picks up the image once it lands.
                new android.os.Handler(getMainLooper()).post(this::updateSession);
            }
        }, "fl-artwork").start();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Shows what is playing and the transport controls");
        channel.setShowBadge(false);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        if (session != null) {
            session.setActive(false);
            session.release();
            session = null;
        }
        super.onDestroy();
    }
}
