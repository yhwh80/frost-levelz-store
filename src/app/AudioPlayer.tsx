"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface AudioPlayerProps {
  src: string;
  trackId: string;
  currentlyPlaying: string | null;
  onPlay: (trackId: string) => void;
}

export default function AudioPlayer({
  src,
  trackId,
  currentlyPlaying,
  onPlay,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Pause when another track starts playing
  useEffect(() => {
    if (currentlyPlaying !== trackId && isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentlyPlaying, trackId, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const togglePlay = useCallback(async () => {
    // Create audio element on first play (avoids autoplay restrictions)
    if (!audioRef.current) {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
      };
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        setIsLoading(false);
      };
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };
      audio.onerror = () => {
        console.error("Audio error:", audio.error);
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
      } catch (err) {
        console.error("Play failed:", err);
        setIsPlaying(false);
      }
      setIsLoading(false);
    }
  }, [isPlaying, onPlay, trackId, src]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-accent/15 hover:bg-accent/30 text-accent transition-colors"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="4" opacity="0.3" />
            <path d="M6 2a4 4 0 0 1 4 4" />
          </svg>
        ) : isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="1" width="3" height="10" rx="0.5" />
            <rect x="7" y="1" width="3" height="10" rx="0.5" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 1.5v9l7.5-4.5L3 1.5z" />
          </svg>
        )}
      </button>

      {/* Progress bar - visible on all screens */}
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[180px]">
        <span className="text-[10px] text-foreground/40 font-mono w-8 text-right hidden sm:inline">
          {formatTime(currentTime)}
        </span>
        <div
          className="flex-1 h-1.5 bg-border rounded-full cursor-pointer group relative min-w-[60px]"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-accent rounded-full relative transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_6px_rgba(137,207,240,0.5)]" />
          </div>
        </div>
        <span className="text-[10px] text-foreground/40 font-mono w-8 hidden sm:inline">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
