"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Suspense, useEffect, useRef } from "react";

function DownloadSection({ sessionId }: { sessionId: string }) {
  const download = useQuery(api.files.getPurchaseStatus, {
    stripeSessionId: sessionId,
  });
  const hasAutoDownloaded = useRef(false);

  // Auto-start download when it becomes available
  useEffect(() => {
    if (download?.status === "ok" && !hasAutoDownloaded.current) {
      hasAutoDownloaded.current = true;
      // Small delay so user sees the page first
      setTimeout(() => {
        window.location.href = `/api/download?session_id=${sessionId}`;
      }, 1500);
    }
  }, [download, sessionId]);

  // Still loading from Convex
  if (download === undefined) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-foreground/40 text-sm">Preparing your download...</p>
      </div>
    );
  }

  // Purchase not found yet — webhook may still be processing
  if (!download) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-foreground/50 text-sm">
          Processing your payment...
        </p>
        <p className="text-foreground/30 text-xs">
          Your download will appear automatically. This usually takes a few seconds.
        </p>
      </div>
    );
  }

  // Check expiry/limits
  if (download.status === "expired") {
    return (
      <p className="text-foreground/50 text-sm">
        This download link has expired. Please contact
        Frostlevelmanagement@gmail.com for help.
      </p>
    );
  }

  if (download.status === "limit") {
    return (
      <p className="text-foreground/50 text-sm">
        Download limit reached (max 5). Please contact
        Frostlevelmanagement@gmail.com for help.
      </p>
    );
  }

  // Both tracks and albums are served through /api/download — albums arrive as
  // a single zip, so there is one button either way.
  const isAlbum = download.kind === "album";

  return (
    <div className="flex flex-col items-center gap-3 mt-4">
      <p className="text-foreground/50 text-sm">
        Your download is starting automatically...
      </p>
      <a
        href={`/api/download?session_id=${sessionId}`}
        className="inline-flex items-center gap-2 bg-accent text-background font-semibold px-8 py-3 rounded-full hover:bg-accent/80 transition-colors frost-btn"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download {download.title} ({download.format.toUpperCase()})
        {isAlbum ? " — ZIP" : ""}
      </a>
      {isAlbum && (
        <p className="text-foreground/40 text-xs">
          {download.trackCount} tracks in one zip file.
        </p>
      )}
      <p className="text-foreground/30 text-xs mt-2">
        If the download didn&apos;t start, click the button above.
      </p>
      <p className="text-foreground/30 text-xs">
        {download.downloadsRemaining} of 5 downloads remaining &middot; link valid for 72 hours
      </p>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="bg-surface rounded-xl border border-border p-8 sm:p-12 text-center max-w-lg w-full">
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
        <p className="text-foreground/70 mb-6">
          Thank you for supporting Frost Levelz!
        </p>

        {sessionId ? (
          <DownloadSection sessionId={sessionId} />
        ) : (
          <p className="text-foreground/50 text-sm">
            Something went wrong with the redirect. Please contact
            Frostlevelmanagement@gmail.com for help.
          </p>
        )}

        {sessionId && (
          <p className="text-foreground/30 text-xs font-mono mt-6">
            Ref: {sessionId.slice(-8)}
          </p>
        )}
        <a
          href="/"
          className="inline-block mt-6 text-accent hover:underline text-sm"
        >
          &larr; Back to Store
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
