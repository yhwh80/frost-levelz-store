"use client";

interface AudioPlayerProps {
  src: string;
  trackId: string;
  currentlyPlaying: string | null;
  onPlay: (trackId: string) => void;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  return (
    <audio
      controls
      preload="none"
      src={src}
      className="h-8 w-40"
      style={{ filter: "invert(1) hue-rotate(180deg) brightness(0.8)" }}
    />
  );
}
