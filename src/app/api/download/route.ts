import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return new Response("Missing session_id", { status: 400 });
  }

  const download = await convex.query(api.files.getDownloadBySession, {
    stripeSessionId: sessionId,
  });

  if (!download) {
    return new Response("Download not found", { status: 404 });
  }

  if ("expired" in download) {
    return new Response("Download link has expired. Please contact Frostlevelmanagement@gmail.com for help.", { status: 410 });
  }

  if ("limitReached" in download) {
    return new Response("Download limit reached (max 5). Please contact Frostlevelmanagement@gmail.com for help.", { status: 429 });
  }

  if (!("url" in download) || !download.url) {
    return new Response("File not available", { status: 404 });
  }

  // Increment download count
  await convex.mutation(api.files.incrementDownloadCount, {
    stripeSessionId: sessionId,
  });

  // Fetch the file from Convex storage
  const fileResponse = await fetch(download.url);
  if (!fileResponse.ok) {
    return new Response("Failed to fetch file", { status: 500 });
  }

  const fileBuffer = await fileResponse.arrayBuffer();

  // Clean filename
  const cleanTitle = download.title
    .replace(/[^a-zA-Z0-9\s\-().,'!]/g, "")
    .trim();
  const filename = `${cleanTitle}.${download.format}`;

  const contentType =
    download.format === "wav" ? "audio/wav" : "audio/mpeg";

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": fileBuffer.byteLength.toString(),
    },
  });
}
