/**
 * Frost Levelz iOS app.
 *
 * A deliberately small client, not a wrapper around the website. It signs in,
 * lists the catalogue and plays audio — nothing is sold here. Apple treats
 * music streaming as a "reader" app, so letting existing subscribers sign in
 * and listen avoids in-app purchase entirely; adding any buy button or price
 * would drag the whole app into Apple's 15–30% commission.
 */

const SITE = "https://frostlevelz.com";
const CONVEX = "https://wonderful-octopus-241.convex.cloud";
const TOKEN_KEY = "fl_session_token";

const $ = (id) => document.getElementById(id);

// The session token lives here rather than in a cookie: a Capacitor app runs on
// its own origin, so cookies to frostlevelz.com would be treated as
// third-party and dropped.
const store = {
  get token() {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  },
  set token(v) {
    try {
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private mode — session just won't persist */
    }
  },
};

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (store.token) headers.Authorization = `Bearer ${store.token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${SITE}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, ok: res.ok, data };
}

/** Public catalogue — no auth needed, same query the website uses. */
async function loadCatalogue() {
  const res = await fetch(`${CONVEX}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "tracks:list", args: {}, format: "json" }),
  });
  const json = await res.json();
  return json.status === "success" ? json.value : [];
}

// ---- Playback -------------------------------------------------------------

const audio = new Audio();
let current = null;
// Kept so the lock screen and the next/previous buttons know where we are.
let catalogue = [];
let subscribed = false;

function setPlayer(track, subtitle) {
  $("player").hidden = false;
  $("np-title").textContent = track.title;
  $("np-sub").textContent = subtitle;
  updateLockScreen(track, subtitle);
}

/**
 * Puts the track on the iOS lock screen and in Control Centre.
 *
 * The native side sets an AVAudioSession playback category, which is what makes
 * iOS treat this app as the current "now playing" source; this supplies the
 * artwork and title it displays, and wires up the hardware/lock-screen buttons
 * so headphones and the car stereo work too.
 */
function updateLockScreen(track, subtitle) {
  if (!("mediaSession" in navigator)) return;

  const art = track.coverImageUrl ? `${SITE}${track.coverImageUrl}` : null;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: "Frost Levelz",
    album: subtitle,
    artwork: art
      ? [
          { src: art, sizes: "512x512", type: "image/jpeg" },
          { src: art, sizes: "256x256", type: "image/jpeg" },
        ]
      : [],
  });

  const at = catalogue.findIndex((t) => t._id === track._id);

  navigator.mediaSession.setActionHandler("play", () => {
    audio.play();
    $("toggle").textContent = "❚❚";
  });
  navigator.mediaSession.setActionHandler("pause", () => {
    audio.pause();
    $("toggle").textContent = "▶";
  });
  navigator.mediaSession.setActionHandler(
    "previoustrack",
    at > 0 ? () => play(catalogue[at - 1], subscribed) : null
  );
  navigator.mediaSession.setActionHandler(
    "nexttrack",
    at >= 0 && at < catalogue.length - 1
      ? () => play(catalogue[at + 1], subscribed)
      : null
  );
}

function markPlaying(id) {
  document.querySelectorAll(".track").forEach((el) => {
    el.classList.toggle("playing", el.dataset.id === id);
  });
}

async function play(track, hasFullAccess) {
  // Subscribers stream the full track through the authenticated endpoint;
  // everyone else gets the same preview clip the website plays.
  // Named distinctly so it doesn't shadow the module-level `subscribed`, which
  // the lock-screen handlers rely on.
  const full = hasFullAccess;
  const src = full
    ? `${SITE}/api/stream?track=${encodeURIComponent(track._id)}`
    : track.previewUrl
      ? `${SITE}${track.previewUrl}`
      : null;

  if (!src) {
    $("library-msg").textContent = "No audio available for that track.";
    return;
  }

  if (current === track._id && !audio.paused) {
    audio.pause();
    $("toggle").textContent = "▶";
    return;
  }

  // An <audio> element can't send an Authorization header, so for full tracks
  // we swap the session for a short-lived signed URL bound to this track.
  // (Downloading the audio and playing a blob doesn't work here: CapacitorHttp
  // routes fetch through native networking, which can't return binary bodies.)
  try {
    if (full) {
      const { status, data } = await api(
        `/api/stream/ticket?track=${encodeURIComponent(track._id)}`
      );
      if (status === 402) {
        $("library-msg").textContent =
          "Subscribe on frostlevelz.com to hear full tracks.";
        return;
      }
      if (!data || !data.ok || !data.url) throw new Error(`ticket ${status}`);
      audio.src = `${SITE}${data.url}`;
    } else {
      audio.src = src;
    }

    current = track._id;
    setPlayer(track, full ? "Full track" : "Preview");
    markPlaying(track._id);
    await audio.play();
    $("toggle").textContent = "❚❚";
  } catch (err) {
    $("library-msg").textContent = "Couldn't play that just now.";
    console.error(err);
  }
}

audio.addEventListener("ended", () => {
  // Roll on to the next track, so a locked phone keeps playing rather than
  // falling silent after one song.
  const at = catalogue.findIndex((t) => t._id === current);
  if (at >= 0 && at < catalogue.length - 1) {
    play(catalogue[at + 1], subscribed);
    return;
  }
  $("toggle").textContent = "▶";
  markPlaying(null);
});

// Keep the lock screen's play/pause in step when iOS drives playback.
audio.addEventListener("play", () => {
  $("toggle").textContent = "❚❚";
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
});
audio.addEventListener("pause", () => {
  $("toggle").textContent = "▶";
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
});

$("toggle").addEventListener("click", async () => {
  if (audio.paused) {
    await audio.play();
    $("toggle").textContent = "❚❚";
  } else {
    audio.pause();
    $("toggle").textContent = "▶";
  }
});

// ---- Screens --------------------------------------------------------------

function show(screen) {
  $("signin").hidden = screen !== "signin";
  $("library").hidden = screen !== "library";
}

async function openLibrary(me) {
  show("library");
  $("who").textContent = me.email || "";
  $("locked").hidden = !!me.subscribed;

  const tracks = await loadCatalogue();
  catalogue = tracks;
  subscribed = !!me.subscribed;
  const list = $("tracks");
  list.innerHTML = "";

  tracks.forEach((t) => {
    const li = document.createElement("li");
    li.className = "track";
    li.dataset.id = t._id;

    const img = document.createElement("img");
    img.src = t.coverImageUrl ? `${SITE}${t.coverImageUrl}` : "";
    img.alt = "";

    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("div");
    title.className = "t";
    title.textContent = t.title;
    const year = document.createElement("div");
    year.className = "muted small";
    year.textContent = t.year || "";
    meta.append(title, year);

    li.append(img, meta);
    li.addEventListener("click", () => play(t, !!me.subscribed));
    list.append(li);
  });

  $("library-msg").textContent = tracks.length ? "" : "Couldn't load the catalogue.";
}

async function restore() {
  if (!store.token) return show("signin");
  const { data } = await api("/api/me");
  if (data && data.signedIn) await openLibrary(data);
  else {
    store.token = null;
    show("signin");
  }
}

// ---- Sign in --------------------------------------------------------------

$("send").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const msg = $("signin-msg");
  if (!email) return;

  $("send").disabled = true;
  msg.className = "msg";
  msg.textContent = "Sending...";

  const { data } = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  $("send").disabled = false;
  if (data && data.ok) {
    msg.className = "msg ok";
    msg.textContent = "Check your email for the link.";
    $("paste-step").hidden = false;
  } else {
    msg.className = "msg err";
    msg.textContent = (data && data.reason) || "Couldn't send the link.";
  }
});

/**
 * Temporary sign-in path: the emailed link opens the website, so for now the
 * link is pasted back here and its one-time token exchanged for a session.
 * A deep link (frostlevelz://) will replace this so the app opens directly.
 */
$("use-link").addEventListener("click", async () => {
  const raw = $("pasted").value.trim();
  const match = raw.match(/[?&]token=([^&\s]+)/);
  if (!match) {
    $("signin-msg").className = "msg err";
    $("signin-msg").textContent = "That doesn't look like a sign-in link.";
    return;
  }
  await signInWithToken(decodeURIComponent(match[1]));
});

/**
 * Signs in when iOS hands the app a frostlevelz://auth?token=... URL.
 *
 * Tapping "Open the app" on the sign-in page fires this, so the token never has
 * to be copied by hand. The token is still single-use and short-lived — this
 * only changes how it gets here.
 */
async function signInWithToken(token) {
  const msg = $("signin-msg");
  msg.className = "msg";
  msg.textContent = "Signing you in...";

  const { data } = await api("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  if (data && data.ok && data.sessionToken) {
    store.token = data.sessionToken;
    msg.textContent = "";
    await restore();
  } else {
    msg.className = "msg err";
    msg.textContent =
      data && data.reason === "already_used"
        ? "That link was already used — request a new one."
        : "That link didn't work. Request a new one.";
  }
}

function handleDeepLink(url) {
  if (!url) return;
  const match = String(url).match(/[?&]token=([^&\s]+)/);
  if (match) void signInWithToken(decodeURIComponent(match[1]));
}

// Capacitor delivers the URL that opened the app. Both cases matter: the app
// already running in the background, and a cold start from the link.
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  const CapApp = window.Capacitor.Plugins.App;
  CapApp.addListener("appUrlOpen", (event) => handleDeepLink(event && event.url));
  CapApp.getLaunchUrl()
    .then((res) => handleDeepLink(res && res.url))
    .catch(() => {});
}

$("signout").addEventListener("click", async () => {
  await api("/api/me", { method: "DELETE" });
  store.token = null;
  audio.pause();
  $("player").hidden = true;
  show("signin");
});

restore();
