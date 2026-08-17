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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Pause when another track starts playing
  useEffect(() => {
    if (currentlyPlaying !== trackId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [currentlyPlaying, trackId, isPlaying]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      onPlay(trackId);
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying, onPlay, trackId]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
  };

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
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() =>
          setDuration(audioRef.current?.duration ?? 0)
        }
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
      />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-accent/15 hover:bg-accent/30 text-accent transition-colors"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
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

      {/* Progress bar */}
      <div
        className="hidden sm:flex items-center gap-2 flex-1 min-w-0 max-w-[180px]"
      >
        <span className="text-[10px] text-foreground/40 font-mono w-8 text-right">
          {formatTime(currentTime)}
        </span>
        <div
          className="flex-1 h-1 bg-border rounded-full cursor-pointer group relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-accent rounded-full relative transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_6px_rgba(137,207,240,0.5)]" />
          </div>
        </div>
        <span className="text-[10px] text-foreground/40 font-mono w-8">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
