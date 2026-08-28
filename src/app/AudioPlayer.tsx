"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface AudioPlayerProps {
  src: string;
  trackId: string;
  currentlyPlaying: string | null;
  onPlay: (trackId: string) => void;
  /** Subscribers stream the full track; everyone else hears the preview clip. */
  fullAccess?: boolean;
}

export default function AudioPlayer({
  src,
  trackId,
  currentlyPlaying,
  onPlay,
  fullAccess = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentlyPlaying !== trackId && isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentlyPlaying, trackId, isPlaying]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // The source is decided at play time, so upgrading to a subscription takes
  // effect on the next press without a page reload.
  const playbackSrc = fullAccess
    ? `/api/stream?track=${encodeURIComponent(trackId)}`
    : src;

  // Drop any existing audio element when access changes, so a subscriber
  // doesn't keep hearing the clip they loaded before subscribing.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, [fullAccess]);

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) {
      const audio = new Audio(playbackSrc);
      audio.onended = () => {
        setIsPlaying(false);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      onPlay(trackId);
      setIsLoading(true);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
      setIsLoading(false);
    }
  }, [isPlaying, onPlay, trackId, playbackSrc]);

  return (
    <button
      onClick={togglePlay}
      title={fullAccess ? "Play full track" : "Preview \u2014 subscribe to hear it all"}
      className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-accent/15 hover:bg-accent/30 text-accent transition-colors active:scale-95"
      aria-label={isPlaying ? "Pause" : fullAccess ? "Play full track" : "Play preview"}
    >
      {isLoading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8" cy="8" r="6" opacity="0.3" />
          <path d="M8 2a6 6 0 0 1 6 6" />
        </svg>
      ) : isPlaying ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect x="2.5" y="1.5" width="3.5" height="11" rx="1" />
          <rect x="8" y="1.5" width="3.5" height="11" rx="1" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M4 2v10l8-5L4 2z" />
        </svg>
      )}
    </button>
  );
}
