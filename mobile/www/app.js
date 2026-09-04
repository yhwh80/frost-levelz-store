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

function setPlayer(track, subtitle) {
  $("player").hidden = false;
  $("np-title").textContent = track.title;
  $("np-sub").textContent = subtitle;
}

function markPlaying(id) {
  document.querySelectorAll(".track").forEach((el) => {
    el.classList.toggle("playing", el.dataset.id === id);
  });
}

async function play(track, subscribed) {
  // Subscribers stream the full track through the authenticated endpoint;
  // everyone else gets the same preview clip the website plays.
  const full = subscribed;
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

  // The stream endpoint needs the bearer token, which a plain <audio src>
  // can't send — so fetch it and hand the player a blob URL instead.
  try {
    if (full) {
      const res = await fetch(src, {
        headers: { Authorization: `Bearer ${store.token}` },
      });
      if (res.status === 402) {
        $("library-msg").textContent =
          "Subscribe on frostlevelz.com to hear full tracks.";
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (audio.src.startsWith("blob:")) URL.revokeObjectURL(audio.src);
      audio.src = URL.createObjectURL(blob);
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
  $("toggle").textContent = "▶";
  markPlaying(null);
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
  const msg = $("signin-msg");
  const match = raw.match(/[?&]token=([^&\s]+)/);
  if (!match) {
    msg.className = "msg err";
    msg.textContent = "That doesn't look like a sign-in link.";
    return;
  }

  const { data } = await api("/api/auth/session", {
    method: "POST",
    body: JSON.stringify({ token: decodeURIComponent(match[1]) }),
  });

  if (data && data.ok && data.sessionToken) {
    store.token = data.sessionToken;
    await restore();
  } else {
    msg.className = "msg err";
    msg.textContent =
      data && data.reason === "already_used"
        ? "That link has already been used — request a new one."
        : "That link didn't work. Request a new one.";
  }
});

$("signout").addEventListener("click", async () => {
  await api("/api/me", { method: "DELETE" });
  store.token = null;
  audio.pause();
  $("player").hidden = true;
  show("signin");
});

restore();
