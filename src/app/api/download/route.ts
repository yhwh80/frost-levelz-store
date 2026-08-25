import { ConvexHttpClient } from "convex/browser";
import { Zip, ZipPassThrough } from "fflate";
import { api } from "../../../../convex/_generated/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const SUPPORT_EMAIL = "Frostlevelmanagement@gmail.com";

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

  const { kind, title, format, files } = result;

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

  // Album: verify every file is reachable before consuming a download, so a
  // dead link doesn't cost the customer one of their five.
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

  return new Response(zipStream(files, format), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${sanitize(title)} (${format.toUpperCase()}).zip"`,
      "Cache-Control": "no-store",
    },
  });
}
