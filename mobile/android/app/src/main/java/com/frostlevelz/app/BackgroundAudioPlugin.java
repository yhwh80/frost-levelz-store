package com.frostlevelz.app;

import android.Manifest;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/**
 * JS bridge for {@link BackgroundAudioService}.
 *
 * JavaScript keeps ownership of playback (it holds the <audio> element); this
 * plugin only tells the service what to display and when to stay alive, and
 * forwards lock-screen button presses back to JS as "remoteCommand" events.
 */
@CapacitorPlugin(
        name = "BackgroundAudio",
        permissions = {
                @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
        }
)
public class BackgroundAudioPlugin extends Plugin {

    @Override
    public void load() {
        BackgroundAudioService.plugin = this;
    }

    /** Called from the service when the user hits a transport control. */
    public void onRemoteCommand(String action) {
        JSObject data = new JSObject();
        data.put("action", action);
        notifyListeners("remoteCommand", data);
    }

    /**
     * Android 13+ will not show the media notification without this, and without
     * a notification there is no foreground service, and without that Android
     * kills playback the moment the app is backgrounded.
     */
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAlias("notifications", call, "permissionCallback");
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(r);
    }

    /** Start (or update) the foreground service and the lock-screen metadata. */
    @PluginMethod
    public void start(PluginCall call) {
        Intent i = new Intent(getContext(), BackgroundAudioService.class)
                .setAction(BackgroundAudioService.ACTION_START)
                .putExtra("title", call.getString("title", "Frost Levelz"))
                .putExtra("artist", call.getString("artist", "Frost Levelz"))
                .putExtra("album", call.getString("album", ""))
                .putExtra("artworkUrl", call.getString("artworkUrl"))
                .putExtra("playing", Boolean.TRUE.equals(call.getBoolean("playing", true)));
        startService(i);
        call.resolve();
    }

    /** Flip the notification between play and pause without re-sending metadata. */
    @PluginMethod
    public void setPlaying(PluginCall call) {
        Intent i = new Intent(getContext(), BackgroundAudioService.class)
                .setAction(BackgroundAudioService.ACTION_UPDATE)
                .putExtra("playing", Boolean.TRUE.equals(call.getBoolean("playing", true)));
        startService(i);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent i = new Intent(getContext(), BackgroundAudioService.class)
                .setAction(BackgroundAudioService.ACTION_STOP);
        startService(i);
        call.resolve();
    }

    private void startService(Intent i) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(i);
        } else {
            getContext().startService(i);
        }
    }

    @Override
    protected void handleOnDestroy() {
        BackgroundAudioService.plugin = null;
        super.handleOnDestroy();
    }
}
