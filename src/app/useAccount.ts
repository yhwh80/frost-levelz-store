"use client";

import { useCallback, useEffect, useState } from "react";

export interface Account {
  signedIn: boolean;
  email?: string;
  subscribed?: boolean;
  renewsAt?: number;
  cancelling?: boolean;
}

/**
 * Reads the signed-in state from /api/me. The session cookie is httpOnly, so
 * the browser can't inspect it directly — the server does the lookup. Nothing
 * here is trusted for access control; the streaming route re-checks on every
 * request. This only decides what the interface shows.
 */
export function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      setAccount(await res.json());
    } catch {
      setAccount({ signedIn: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { account, loading: account === null, refresh };
}
