import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Frost Levelz",
    short_name: "Frost Levelz",
    description:
      "Buy Frost Levelz music direct from the artist, and stream the full catalogue.",
    start_url: "/",
    // standalone opens without browser chrome, so it reads as an app rather
    // than a bookmarked page.
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    categories: ["music", "entertainment", "shopping"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // maskable lets Android crop to whatever icon shape the launcher uses
      // without clipping something important.
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Music", url: "/#music" },
      { name: "Your Account", url: "/account" },
    ],
  };
}
