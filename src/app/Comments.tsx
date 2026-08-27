"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const MAX_BODY = 500;

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Comments() {
  const comments = useQuery(api.comments.listVisible, {});
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const mountedAt = useRef(Date.now());

  // Reset the fill-time clock after a successful post so a second genuine
  // comment isn't flagged as "too quick".
  useEffect(() => {
    if (status === "sent") mountedAt.current = Date.now();
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setMessage(null);

    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          body,
          website,
          fillMs: Date.now() - mountedAt.current,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setStatus("sent");
        setBody("");
        setMessage(
          data.pending
            ? "Thanks — your comment will appear once it's been checked."
            : "Posted. Thanks for the support!"
        );
      } else {
        setStatus("error");
        setMessage(data.reason ?? "Couldn't post that.");
      }
    } catch {
      setStatus("error");
      setMessage("Couldn't post that — check your connection.");
    }
  };

  return (
    <section id="comments" className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-16">
      <h2 className="frost-heading text-2xl font-bold mb-8 uppercase tracking-wide">
        Leave A Message
      </h2>

      <form
        onSubmit={submit}
        className="bg-surface rounded-xl border border-border p-5 sm:p-6 mb-8"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          required
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm mb-3 focus:border-accent/50 focus:outline-none transition-colors"
        />

        {/* Honeypot: hidden from people, irresistible to bots. */}
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
          placeholder="Say something to Frost..."
          rows={3}
          required
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm resize-y focus:border-accent/50 focus:outline-none transition-colors"
        />

        <div className="flex items-center justify-between gap-3 mt-3">
          <span className="text-foreground/30 text-xs">
            {body.length}/{MAX_BODY} &middot; no links
          </span>
          <button
            type="submit"
            disabled={status === "sending"}
            className="bg-accent text-background text-xs font-semibold px-5 py-2 rounded-full hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {status === "sending" ? "Posting..." : "Post"}
          </button>
        </div>

        {message && (
          <p
            className={`text-xs mt-3 ${
              status === "error" ? "text-red-400/80" : "text-accent"
            }`}
          >
            {message}
          </p>
        )}
      </form>

      {comments === undefined ? (
        <p className="text-foreground/30 text-sm text-center">Loading messages...</p>
      ) : comments.length === 0 ? (
        <p className="text-foreground/40 text-sm text-center">
          No messages yet — be the first.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div
              key={c._id}
              className="bg-surface rounded-lg border border-border p-4"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-accent font-semibold text-sm">{c.name}</span>
                <span className="text-foreground/25 text-xs flex-shrink-0">
                  {timeAgo(c.createdAt)}
                </span>
              </div>
              <p className="text-foreground/70 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
