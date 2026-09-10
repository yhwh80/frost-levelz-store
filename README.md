# Frost Levelz — direct-to-fan store

A store and mobile app for an independent hip-hop artist: his music sold and streamed direct to fans, with no platform taking a cut in the middle.

**Live at [frostlevelz.com](https://frostlevelz.com)**

Built to a real brief for a working artist rather than as a template exercise — so every decision below was made against someone else's requirements and someone else's deadline.

## What it does

- **Buy or subscribe.** One-off album and track purchases, plus a subscription for the full catalogue. Stripe handles payment; cancellation is self-service from the account page.
- **Stream and download.** Purchased audio streams in-browser and in the app, and downloads arrive as a zip with ID3 tags already written, so tracks land in a library with artwork and metadata intact.
- **Comment and moderate.** Fans can comment. The artist moderates from an admin page — no terminal, no database client.
- **Mobile.** An iOS app shipped via Capacitor, with background audio, lock-screen controls, and deep links so tapping the sign-in email opens the app. Android is built and going through Play Store registration.

## Decisions worth explaining

**Playback runs on short-lived signed URLs.** Paid audio is never served from a guessable path. A URL is minted per request and expires, so a link pasted into a group chat is dead by the time anyone clicks it. The alternative — public files behind an obscure path — is not access control, it's hope.

**Health checks alert on the second failure, not the first.** A cron runs every 15 minutes, but only emails after two consecutive failures. A redeploy or a momentary blip shouldn't page anyone; a real outage still surfaces inside half an hour. The person receiving that email is an artist, not an on-call engineer, so a false alarm costs more than 15 minutes of delay.

**Cancellations are read from two places.** Stripe records a cancellation either as a boolean or as a `cancel_at` timestamp depending on how it was triggered. Reading only the boolean silently keeps billing people who have cancelled — so both are checked.

**Moderation is a page, not a script.** Anything the artist needs to do routinely has an interface. If the only way to handle a comment were a database query, the feature would effectively not exist.

**Accessibility was specified, not assumed.** The design system fixes a contrast budget up front: the brand blue on the dark background measures 11.2:1, and every interactive element has to clear 4.5:1. Written down in `design.md` so it can't drift.

## Stack

- **Next.js** (App Router) + TypeScript
- **Convex** — database, server functions, cron jobs
- **Stripe** — one-off purchases, subscriptions, customer portal, webhooks
- **Capacitor** — iOS app (Android in progress)
- **Three.js / react-three-fiber** + Framer Motion — the ice-particle visual and page transitions
- `node-id3` for tagging downloads, `fflate` for zipping albums

## Layout

```
convex/          schema, auth, albums, tracks, purchases,
                 subscriptions, stripe, comments, email,
                 crons, health, files, maintenance
src/app/         storefront, account, admin, signin,
                 privacy, terms, api routes
src/app/api/     auth · subscribe · portal · webhook
                 stream · download · comment · admin · me
mobile/          Capacitor project (iOS)
design.md        design system: palette, type, contrast budget
```

## Status

Live and in use. iOS shipped; Android built and awaiting Play Store registration.

---

Built by [Simon Powell](https://www.linkedin.com/in/simonpowell-ai).
