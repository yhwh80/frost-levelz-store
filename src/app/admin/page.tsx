"use client";

import { useCallback, useEffect, useState } from "react";

interface Comment {
  id: string;
  status: string;
  name: string;
  body: string;
  at: string;
}

interface Overview {
  ok: boolean;
  email?: string;
  comments?: Comment[];
  commentsEnabled?: boolean;
  requiresApproval?: boolean;
  reason?: string;
}

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin", { cache: "no-store" });
      setData(await res.json());
    } catch {
      setData({ ok: false, reason: "error" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (data === null) {
    return <Shell><p className="text-foreground/40 text-sm">Loading...</p></Shell>;
  }

  if (!data.ok) {
    return (
      <Shell>
        <p className="text-foreground/60 text-sm mb-4">
          You need to be signed in as an admin to see this page.
        </p>
        <a href="/account" className="text-accent hover:underline text-sm">
          Sign in &rarr;
        </a>
      </Shell>
    );
  }

  const comments = data.comments ?? [];

  return (
    <Shell>
      <p className="text-foreground/40 text-xs mb-6">Signed in as {data.email}</p>

      <div className="bg-surface border border-border rounded-lg p-5 mb-8 flex flex-col gap-4">
        <Toggle
          label="Comments visible on the site"
          hint="Turn off to hide every comment instantly."
          on={data.commentsEnabled ?? true}
          busy={busy === "commentsEnabled"}
          onChange={(v) =>
            act({ op: "setting", key: "commentsEnabled", value: v }, "commentsEnabled")
          }
        />
        <Toggle
          label="Approve comments before they appear"
          hint="New comments queue here instead of publishing straight away."
          on={data.requiresApproval ?? false}
          busy={busy === "commentsRequireApproval"}
          onChange={(v) =>
            act(
              { op: "setting", key: "commentsRequireApproval", value: v },
              "commentsRequireApproval"
            )
          }
        />
      </div>

      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-foreground/60">
        Comments ({comments.length})
      </h2>

      {comments.length === 0 ? (
        <p className="text-foreground/40 text-sm">Nothing posted yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border p-4 ${
                c.status === "visible"
                  ? "bg-surface border-border"
                  : "bg-surface/40 border-border/50"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-accent font-semibold text-sm">{c.name}</span>
                <span className="text-foreground/25 text-xs flex-shrink-0">
                  {c.at.slice(0, 16).replace("T", " ")}
                  {c.status !== "visible" && " · hidden"}
                </span>
              </div>
              <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
                {c.body}
              </p>
              <div className="flex gap-2">
                {c.status === "visible" ? (
                  <Btn
                    onClick={() => act({ op: "moderate", commentId: c.id, action: "hide" }, c.id)}
                    busy={busy === c.id}
                  >
                    Hide
                  </Btn>
                ) : (
                  <Btn
                    onClick={() => act({ op: "moderate", commentId: c.id, action: "show" }, c.id)}
                    busy={busy === c.id}
                  >
                    Show
                  </Btn>
                )}
                <Btn
                  danger
                  onClick={() => act({ op: "moderate", commentId: c.id, action: "delete" }, c.id)}
                  busy={busy === c.id}
                >
                  Delete
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-16">
      <h1 className="frost-heading text-xl font-bold mb-6 uppercase tracking-wide">
        Moderation
      </h1>
      {children}
      <a href="/" className="inline-block mt-10 text-accent hover:underline text-sm">
        &larr; Back to Store
      </a>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  busy,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  busy: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-foreground/40 text-xs mt-0.5">{hint}</p>
      </div>
      <button
        onClick={() => onChange(!on)}
        disabled={busy}
        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
          on
            ? "bg-accent text-background"
            : "bg-background border border-border text-foreground/50"
        }`}
      >
        {busy ? "..." : on ? "On" : "Off"}
      </button>
    </div>
  );
}

function Btn({
  children,
  onClick,
  busy,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
        danger
          ? "bg-red-500/10 text-red-400/90 hover:bg-red-500/20"
          : "bg-accent/10 text-accent hover:bg-accent/20"
      }`}
    >
      {children}
    </button>
  );
}
