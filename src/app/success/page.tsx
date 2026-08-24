"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Suspense, useEffect, useRef } from "react";

function DownloadSection({ sessionId }: { sessionId: string }) {
  const download = useQuery(api.files.getDownloadBySession, {
    stripeSessionId: sessionId,
  });
  const hasAutoDownloaded = useRef(false);

  // Auto-start download when it becomes available
  useEffect(() => {
    if (download && "url" in download && download.url && !hasAutoDownloaded.current) {
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

  // Single track download
  if ("url" in download && download.url) {
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
        </a>
        <p className="text-foreground/30 text-xs mt-2">
          If the download didn&apos;t start, click the button above.
        </p>
      </div>
    );
  }

  // Album download (multiple tracks)
  if ("tracks" in download) {
    const trackList = download.tracks as Array<{
      url: string | null;
      title: string;
      trackNumber?: number;
      format: string;
    }>;
    return (
      <div className="mt-4 flex flex-col gap-2 w-full max-w-md">
        <p className="text-foreground/50 text-sm mb-2">
          Your album is ready — download each track below:
        </p>
        {trackList.map((track, i: number) =>
          track?.url ? (
            <a
              key={i}
              href={track.url}
              download={`${track.trackNumber ?? i + 1}. ${track.title}.${track.format}`}
              className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3 border border-border hover:border-accent/40 transition-colors text-left"
            >
              <span className="text-foreground/30 text-xs w-4">
                {track.trackNumber ?? i + 1}
              </span>
              <span className="flex-1 text-sm truncate">{track.title}</span>
              <svg
                className="w-4 h-4 text-accent flex-shrink-0"
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
            </a>
          ) : null
        )}
      </div>
    );
  }

  return null;
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
          <p className="text-foreground/30 text-xs font-mono mt-6 break-all">
            Ref: {sessionId}
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
