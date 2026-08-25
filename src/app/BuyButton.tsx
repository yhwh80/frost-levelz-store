"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface BuyButtonProps {
  trackId?: Id<"tracks">;
  albumId?: Id<"albums">;
  priceMp3: number;
  variant?: "primary" | "ghost";
}

// WAV is hidden for now: only one track in the catalogue has a WAV master, so
// offering it took money for files we couldn't deliver. Restore the format
// picker once the masters are uploaded.
export default function BuyButton({
  trackId,
  albumId,
  priceMp3,
  variant = "ghost",
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createCheckout = useAction(api.stripe.createCheckoutSession);

  const handleBuy = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await createCheckout({ trackId, albumId, format: "mp3" });
      if (url) {
        window.location.href = url;
      } else {
        setError("Checkout unavailable");
      }
    } catch {
      setError("Couldn't start checkout");
    } finally {
      setLoading(false);
    }
  };

  const baseClass =
    variant === "primary"
      ? "bg-accent text-background text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent/80 transition-colors"
      : "bg-accent/10 text-accent text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent hover:text-background transition-colors";

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleBuy} disabled={loading} className={`${baseClass} disabled:opacity-50`}>
        {loading ? "..." : `Buy £${priceMp3.toFixed(2)}`}
      </button>
      {error && (
        <span className="text-[10px] text-red-400/80">{error}</span>
      )}
    </div>
  );
}
