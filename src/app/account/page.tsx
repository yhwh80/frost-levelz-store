"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "../useAccount";

const ERRORS: Record<string, string> = {
  expired: "That sign-in link has expired. Request a new one below.",
  already_used: "That link has already been used. Request a new one below.",
  invalid: "That sign-in link isn't valid. Request a new one below.",
  missing: "That link was incomplete. Request a new one below.",
  cancelled: "Sign-in was cancelled.",
  bad_state: "Sign-in couldn't be verified. Please try again.",
  unverified_email: "That Google account's email isn't verified.",
  google_unavailable: "Google sign-in isn't set up yet — use your email instead.",
};

function SignIn() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) setState("sent");
      else {
        setState("idle");
        setError(data.reason ?? "Couldn't send the link.");
      }
    } catch {
      setState("idle");
      setError("Couldn't send the link — check your connection.");
    }
  };

  if (state === "sent") {
    return (
      <div className="text-center">
        <p className="text-accent font-semibold mb-2">Check your email</p>
        <p className="text-foreground/60 text-sm">
          We&apos;ve sent a sign-in link to <strong>{email}</strong>. It works once and
          expires in 15 minutes.
        </p>
        <button
          onClick={() => setState("idle")}
          className="text-foreground/40 hover:text-accent text-xs mt-4 underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <a
        href="/api/auth/google"
        className="w-full flex items-center justify-center gap-2 bg-white text-[#1f1f1f] font-semibold text-sm px-4 py-3 rounded-lg hover:bg-white/90 transition-colors"
      >
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.5 5-4.4 7l6.7 5.2C42.2 36 45 30.6 45 24z" />
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.7-5.2c-1.9 1.3-4.4 2.2-7.8 2.2-6 0-11-4-12.8-9.4l-7 5.4C7.8 41 15.3 46 24 46z" />
          <path fill="#FBBC05" d="M11.2 28.3A13.6 13.6 0 0 1 10.5 24c0-1.5.3-3 .7-4.3l-7-5.4A22 22 0 0 0 2 24c0 3.5.9 6.9 2.2 9.7l7-5.4z" />
          <path fill="#EA4335" d="M24 10.5c4.2 0 7.1 1.8 8.7 3.3l6-5.8C34.9 4.6 29.9 2 24 2 15.3 2 7.8 7 4.2 14.3l7 5.4C13 14.5 18 10.5 24 10.5z" />
        </svg>
        Continue with Google
      </a>

      <div className="flex items-center gap-3 my-5">
        <div className="h-px bg-border flex-1" />
        <span className="text-foreground/30 text-xs">or</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <form onSubmit={submit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm mb-3 focus:border-accent/50 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="w-full bg-accent text-background font-semibold text-sm px-4 py-3 rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {state === "sending" ? "Sending..." : "Email me a sign-in link"}
        </button>
      </form>

      {error && <p className="text-red-400/80 text-xs mt-3">{error}</p>}
      <p className="text-foreground/30 text-xs mt-4 text-center">
        No password needed. We&apos;ll never share your email.
      </p>
    </div>
  );
}

function AccountBody() {
  const params = useSearchParams();
  const { account, loading, refresh } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlError = params.get("error");
  const justSubscribed = params.get("subscribed") === "1";

  const subscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.url) window.location.href = data.url;
      else {
        setError(data.reason ?? "Couldn't start checkout.");
        setBusy(false);
      }
    } catch {
      setError("Couldn't start checkout.");
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/me", { method: "DELETE" });
    await refresh();
  };

  if (loading) {
    return <p className="text-foreground/30 text-sm text-center">Loading...</p>;
  }

  if (!account?.signedIn) {
    return (
      <>
        {urlError && (
          <p className="text-red-400/80 text-xs mb-4 text-center">
            {ERRORS[urlError] ?? "Something went wrong signing in."}
          </p>
        )}
        <SignIn />
      </>
    );
  }

  return (
    <div>
      <p className="text-foreground/40 text-xs mb-1">Signed in as</p>
      <p className="text-foreground font-semibold mb-6 break-all">{account.email}</p>

      {justSubscribed && !account.subscribed && (
        <p className="text-accent text-sm mb-4">
          Payment received — your access is being activated. Refresh in a moment.
        </p>
      )}

      {account.subscribed ? (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-5 mb-5">
          <p className="text-accent font-bold mb-1">Full Access active</p>
          <p className="text-foreground/60 text-sm">
            Every track plays in full across the site.
          </p>
          {account.renewsAt && (
            <p className="text-foreground/40 text-xs mt-3">
              {account.cancelling ? "Access ends" : "Renews"}{" "}
              {new Date(account.renewsAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg p-5 mb-5">
          <p className="font-bold mb-1">Full Access — £2.99/month</p>
          <p className="text-foreground/60 text-sm mb-4">
            Stream every track in full, including new releases as they land.
            Cancel any time.
          </p>
          <button
            onClick={subscribe}
            disabled={busy}
            className="w-full bg-accent text-background font-semibold text-sm px-4 py-3 rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {busy ? "..." : "Subscribe"}
          </button>
          <p className="text-foreground/30 text-xs mt-3">
            Streaming only — buying a track still gets you the file to keep.
          </p>
        </div>
      )}

      {error && <p className="text-red-400/80 text-xs mb-3">{error}</p>}

      <button
        onClick={signOut}
        className="text-foreground/40 hover:text-accent text-xs underline"
      >
        Sign out
      </button>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="bg-surface rounded-xl border border-border p-8 max-w-sm w-full">
        <h1 className="frost-heading text-xl font-bold mb-6 uppercase tracking-wide text-center">
          Your Account
        </h1>
        <Suspense
          fallback={<p className="text-foreground/30 text-sm text-center">Loading...</p>}
        >
          <AccountBody />
        </Suspense>
        <a
          href="/"
          className="block text-center text-accent hover:underline text-sm mt-6"
        >
          &larr; Back to Store
        </a>
      </div>
    </div>
  );
}
