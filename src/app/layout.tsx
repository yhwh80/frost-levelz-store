import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://frostlevelz.com";
const TITLE = "Frost Levelz | Official Music Store";
const DESCRIPTION =
  "Buy and download music directly from Frost Levelz. Hip-hop & rap straight from Brixton, London.";

export const metadata: Metadata = {
  // Required for the relative image paths below to render as absolute URLs in
  // the og:/twitter: tags. Without it Next falls back to localhost and every
  // share preview breaks.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Frost Levelz",
    locale: "en_GB",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Ghost-Writer album artwork, Frost Levelz",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.jpg"],
  },
  // iOS ignores much of the web manifest, so the home-screen behaviour has to
  // be declared with these Apple-specific tags as well.
  appleWebApp: {
    capable: true,
    title: "Frost Levelz",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  // Lets the layout run under the notch on iPhones when installed.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="frost-logo text-xl font-bold tracking-wider uppercase">
              Frost Levelz
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <a href="#music" className="text-foreground/70 hover:text-accent transition-colors">
                Music
              </a>
              <a href="#about" className="text-foreground/70 hover:text-accent transition-colors">
                About
              </a>
              <a href="#contact" className="text-foreground/70 hover:text-accent transition-colors">
                Contact
              </a>
              <Link href="/account" className="text-accent hover:text-accent/70 transition-colors font-semibold">
                Account
              </Link>
            </div>
          </div>
        </nav>
        <ConvexClientProvider>
          <main className="flex-1">{children}</main>
        </ConvexClientProvider>
        <footer className="border-t border-border py-8 text-center text-sm text-foreground/40">
          <p>&copy; {new Date().getFullYear()} Frost Levelz. All rights reserved.</p>
          <p className="mt-3 flex items-center justify-center gap-4 text-xs">
            <Link href="/privacy" className="hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <span className="text-foreground/20">&middot;</span>
            <Link href="/terms" className="hover:text-accent transition-colors">
              Terms of Service
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
