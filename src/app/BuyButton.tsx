"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface BuyButtonProps {
  trackId?: Id<"tracks">;
  albumId?: Id<"albums">;
  priceMp3: number;
  priceWav: number;
  variant?: "primary" | "ghost";
}

export default function BuyButton({
  trackId,
  albumId,
  priceMp3,
  priceWav,
  variant = "ghost",
}: BuyButtonProps) {
  const [showFormats, setShowFormats] = useState(false);
  const [loading, setLoading] = useState(false);
  const createCheckout = useAction(api.stripe.createCheckoutSession);

  const handleBuy = async (format: "mp3" | "wav") => {
    setLoading(true);
    try {
      const url = await createCheckout({ trackId, albumId, format });
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      alert(message);
    } finally {
      setLoading(false);
      setShowFormats(false);
    }
  };

  const baseClass =
    variant === "primary"
      ? "bg-accent text-background text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent/80 transition-colors"
      : "bg-accent/10 text-accent text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent hover:text-background transition-colors";

  if (showFormats) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleBuy("mp3")}
          disabled={loading}
          className="bg-accent text-background text-[10px] font-semibold px-3 py-1.5 rounded-full hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : `MP3 £${priceMp3.toFixed(2)}`}
        </button>
        <button
          onClick={() => handleBuy("wav")}
          disabled={loading}
          className="bg-accent/20 text-accent text-[10px] font-semibold px-3 py-1.5 rounded-full hover:bg-accent hover:text-background transition-colors disabled:opacity-50"
        >
          {loading ? "..." : `WAV £${priceWav.toFixed(2)}`}
        </button>
        <button
          onClick={() => setShowFormats(false)}
          className="text-foreground/30 hover:text-foreground/60 text-xs ml-1 transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setShowFormats(true)} className={baseClass}>
      Buy
    </button>
  );
}
