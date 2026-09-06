"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Landing page for the emailed sign-in link.
 *
 * The link can't go straight to the callback any more: on a phone we want it to
 * open the app, and on a desktop we want the website. So it lands here, which
 * offers both — and crucially consumes the single-use token in neither case, so
 * choosing the wrong one first doesn't burn it.
 *
 * A custom scheme is used rather than a Universal Link because the latter needs
 * a paid Apple Developer account to set up the associated domain.
 */
function SignInLanding() {
  const token = useSearchParams().get("token") ?? "";
  const [isPhone, setIsPhone] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setIsPhone(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  if (!token) {
    return (
      <p className="text-foreground/60 text-sm">
        This link is incomplete. Please request a new one.
      </p>
    );
  }

  const appUrl = `frostlevelz://auth?token=${encodeURIComponent(token)}`;
  const webUrl = `/api/auth/callback?token=${encodeURIComponent(token)}`;

  return (
    <>
      <p className="text-foreground/60 text-sm mb-6">
        {isPhone
          ? "Where would you like to sign in?"
          : "Continue to sign in below."}
      </p>

      {isPhone && (
        <>
          <a
            href={appUrl}
            onClick={() => setTried(true)}
            className="block w-full bg-accent text-background font-semibold text-center px-4 py-3.5 rounded-lg mb-3"
          >
            Open the app
          </a>
          {tried && (
            <p className="text-foreground/40 text-xs mb-4 text-center">
              Nothing happened? You may not have the app installed — use the
              website instead.
            </p>
          )}
        </>
      )}

      <a
        href={webUrl}
        className={
          isPhone
            ? "block w-full bg-surface border border-border text-foreground text-center font-semibold px-4 py-3.5 rounded-lg"
            : "block w-full bg-accent text-background text-center font-semibold px-4 py-3.5 rounded-lg"
        }
      >
        {isPhone ? "Use the website" : "Sign in"}
      </a>

      <p className="text-foreground/30 text-xs mt-6 text-center">
        This link works once and expires 15 minutes after it was sent.
      </p>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="bg-surface rounded-xl border border-border p-8 max-w-sm w-full">
        <div className="text-accent text-xs font-bold tracking-[2px] uppercase mb-3">
          Frost Levelz
        </div>
        <h1 className="frost-heading text-xl font-bold mb-4 uppercase tracking-wide">
          Sign in
        </h1>
        <Suspense
          fallback={<p className="text-foreground/40 text-sm">Loading...</p>}
        >
          <SignInLanding />
        </Suspense>
      </div>
    </div>
  );
}
