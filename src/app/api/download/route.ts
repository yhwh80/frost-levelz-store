import { ConvexHttpClient } from "convex/browser";
import { Zip, ZipPassThrough } from "fflate";
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { api } from "../../../../convex/_generated/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const SUPPORT_EMAIL = "Frostlevelmanagement@gmail.com";

// Every buyer of the same album gets a byte-identical zip, so building it once
// and serving it from local disk keeps ~101 MB per sale off the Convex
// bandwidth allowance. Cache lives in the container's tmp dir: it is lost on
// redeploy, which just means the next download rebuilds it.
const CACHE_DIR =
  process.env.ZIP_CACHE_DIR ?? path.join(os.tmpdir(), "frost-album-cache");

type DownloadFile = {
  title: string;
  trackNumber?: number;
  url: string;
};

/** Strip anything that could break a Content-Disposition header or a zip path. */
function sanitize(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9\s\-().,'!&]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : "download";
}

function entryName(file: DownloadFile, format: string): string {
  const prefix =
    file.trackNumber != null
      ? `${String(file.trackNumber).padStart(2, "0")} `
      : "";
  return `${prefix}${sanitize(file.title)}.${format}`;
}

function contentTypeFor(format: string): string {
  return format === "wav" ? "audio/wav" : "audio/mpeg";
}

function textResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Cache identity for a built album zip.
 *
 * The fingerprint hashes the exact set of file URLs, and a Convex storage URL
 * embeds its storage id — so re-uploading or swapping any track produces a new
 * fingerprint and therefore a new cache entry. That makes the cache
 * self-invalidating; there is no manual purge to forget.
 */
function cacheIdentity(
  cacheGroup: string,
  format: string,
  files: DownloadFile[]
) {
  const fingerprint = createHash("sha256")
    .update(`${format}\n${files.map((f) => f.url).join("\n")}`)
    .digest("hex")
    .slice(0, 16);
  const group = cacheGroup.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
  const prefix = `album-${group}-${format}-`;
  return { prefix, filename: `${prefix}${fingerprint}.zip` };
}

/** Drop superseded builds for this album so the cache can't grow without bound. */
async function pruneSuperseded(prefix: string, keep: string) {
  try {
    for (const name of await readdir(CACHE_DIR)) {
      if (name.startsWith(prefix) && name !== keep) {
        await unlink(path.join(CACHE_DIR, name)).catch(() => {});
      }
    }
  } catch {
    // Pruning is best-effort housekeeping; never fail a download over it.
  }
}

function fileResponse(
  filePath: string,
  size: number,
  downloadName: string
): Response {
  const nodeStream = createReadStream(filePath);
  return new Response(Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Content-Length": size.toString(),
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Streams the album as a single zip. Files are fetched one at a time and piped
 * straight through, so peak memory stays around one track rather than the whole
 * album, and we respect consumer backpressure via desiredSize.
 */
function zipStream(files: DownloadFile[], format: string): ReadableStream<Uint8Array> {
  let releasePull: (() => void) | null = null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = new Zip();
      zip.ondata = (err, chunk, final) => {
        if (err) {
          controller.error(err);
          return;
        }
        if (chunk && chunk.length > 0) controller.enqueue(chunk);
        if (final) controller.close();
      };

      const waitForPull = () =>
        new Promise<void>((resolve) => {
          releasePull = resolve;
        });

      const pump = async () => {
        try {
          for (const file of files) {
            const upstream = await fetch(file.url);
            if (!upstream.ok || !upstream.body) {
              throw new Error(`Failed to fetch "${file.title}"`);
            }

            const entry = new ZipPassThrough(entryName(file, format));
            zip.add(entry);

            const reader = upstream.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              entry.push(value, false);
              if (controller.desiredSize !== null && controller.desiredSize <= 0) {
                await waitForPull();
              }
            }
            entry.push(new Uint8Array(0), true);
          }
          zip.end();
        } catch (err) {
          controller.error(err);
        }
      };

      // Deliberately not awaited: returning a promise from start() would make
      // the stream buffer the entire zip before the client sees a byte.
      void pump();
    },
    pull() {
      releasePull?.();
      releasePull = null;
    },
  });
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");

  if (!sessionId) {
    return textResponse("Missing session_id", 400);
  }

  const secret = process.env.DOWNLOAD_SERVER_SECRET;
  if (!secret) {
    console.error("DOWNLOAD_SERVER_SECRET is not set");
    return textResponse(
      `Downloads are temporarily unavailable. Please contact ${SUPPORT_EMAIL}.`,
      500
    );
  }

  const result = await convex.action(api.files.authorizeDownload, {
    secret,
    stripeSessionId: sessionId,
  });

  switch (result.status) {
    case "notfound":
      return textResponse("Download not found", 404);
    case "expired":
      return textResponse(
        `Download link has expired. Please contact ${SUPPORT_EMAIL} for help.`,
        410
      );
    case "limit":
      return textResponse(
        `Download limit reached (max 5). Please contact ${SUPPORT_EMAIL} for help.`,
        429
      );
    case "unavailable":
      return textResponse(
        `That file isn't ready yet. Please contact ${SUPPORT_EMAIL} and we'll sort it out.`,
        404
      );
  }

  const { kind, title, format, files, cacheGroup } = result;

  if (kind === "track") {
    const file = files[0];
    const upstream = await fetch(file.url);
    if (!upstream.ok || !upstream.body) {
      return textResponse("Failed to fetch file", 502);
    }

    // Only count the download once the file is actually on its way.
    await convex.action(api.files.consumeDownload, {
      secret,
      stripeSessionId: sessionId,
    });

    const headers: Record<string, string> = {
      "Content-Type": contentTypeFor(format),
      "Content-Disposition": `attachment; filename="${sanitize(title)}.${format}"`,
      "Cache-Control": "no-store",
    };
    const length = upstream.headers.get("content-length");
    if (length) headers["Content-Length"] = length;

    return new Response(upstream.body, { headers });
  }

  // ---- Album ----
  const { prefix, filename } = cacheIdentity(cacheGroup, format, files);
  const cachePath = path.join(CACHE_DIR, filename);
  const downloadName = `${sanitize(title)} (${format.toUpperCase()}).zip`;

  // Cache hit: serve from local disk and touch Convex storage not at all.
  try {
    const cached = await stat(cachePath);
    if (cached.isFile() && cached.size > 0) {
      await convex.action(api.files.consumeDownload, {
        secret,
        stripeSessionId: sessionId,
      });
      return fileResponse(cachePath, cached.size, downloadName);
    }
  } catch {
    // Not cached yet — fall through and build it.
  }

  // Verify every file is reachable before consuming a download, so a dead link
  // doesn't cost the customer one of their five.
  for (const file of files) {
    const probe = await fetch(file.url, { method: "HEAD" });
    if (!probe.ok) {
      return textResponse(
        `Some album files are unavailable. Please contact ${SUPPORT_EMAIL}.`,
        502
      );
    }
  }

  await convex.action(api.files.consumeDownload, {
    secret,
    stripeSessionId: sessionId,
  });

  const built = zipStream(files, format);
  let clientStream: ReadableStream<Uint8Array> = built;

  // Split the stream: the buyer downloads progressively while the same bytes
  // are written to disk for everyone after them. If anything about caching
  // fails, the buyer still gets their music — the download never depends on it.
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const [toBuyer, toDisk] = built.tee();
    clientStream = toBuyer;

    const tmpPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
    void (async () => {
      try {
        await pipeline(
          Readable.fromWeb(toDisk as Parameters<typeof Readable.fromWeb>[0]),
          createWriteStream(tmpPath)
        );
        // Rename is atomic, so a reader never sees a half-written zip.
        await rename(tmpPath, cachePath);
        await pruneSuperseded(prefix, filename);
      } catch {
        await unlink(tmpPath).catch(() => {});
      }
    })();
  } catch {
    // No writable cache dir; serve the freshly built zip and move on.
  }

  return new Response(clientStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "no-store",
    },
  });
}
