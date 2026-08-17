"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-surface rounded-xl border border-border p-8 sm:p-12 text-center max-w-lg">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/15 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="frost-heading text-2xl font-bold mb-4 uppercase tracking-wide">
          Payment Successful
        </h1>
        <p className="text-foreground/70 mb-2">
          Thank you for supporting Frost Levelz!
        </p>
        <p className="text-foreground/50 text-sm mb-8">
          A confirmation email with your download link has been sent. Check your
          inbox (and spam folder).
        </p>
        {sessionId && (
          <p className="text-foreground/30 text-xs font-mono mb-6 break-all">
            Ref: {sessionId}
          </p>
        )}
        <a
          href="/"
          className="inline-block bg-accent text-background font-semibold px-8 py-3 rounded-full hover:bg-accent/80 transition-colors frost-btn"
        >
          Back to Store
        </a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-foreground/30">Loading...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
