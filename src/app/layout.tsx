import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Frost Levelz | Official Music Store",
  description:
    "Buy and download music directly from Frost Levelz. Hip-hop & rap straight from Brixton, London.",
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
            <a href="/" className="frost-logo text-xl font-bold tracking-wider uppercase">
              Frost Levelz
            </a>
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
              <a href="/account" className="text-accent hover:text-accent/70 transition-colors font-semibold">
                Account
              </a>
            </div>
          </div>
        </nav>
        <ConvexClientProvider>
          <main className="flex-1">{children}</main>
        </ConvexClientProvider>
        <footer className="border-t border-border py-8 text-center text-sm text-foreground/40">
          <p>&copy; {new Date().getFullYear()} Frost Levelz. All rights reserved.</p>
          <p className="mt-3 flex items-center justify-center gap-4 text-xs">
            <a href="/privacy" className="hover:text-accent transition-colors">
              Privacy Policy
            </a>
            <span className="text-foreground/20">&middot;</span>
            <a href="/terms" className="hover:text-accent transition-colors">
              Terms of Service
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
