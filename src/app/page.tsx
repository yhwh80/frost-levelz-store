"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import IceParticles from "./IceParticles";
import AudioPlayer from "./AudioPlayer";
import BuyButton from "./BuyButton";
import ScrollReveal, { StaggerContainer, StaggerItem } from "./ScrollReveal";

export default function Home() {
  const tracks = useQuery(api.tracks.list);
  const albums = useQuery(api.albums.list);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  // Split tracks into album tracks and singles
  const singles = tracks?.filter((t) => !t.albumId) ?? [];
  const albumTracks = tracks?.filter((t) => t.albumId) ?? [];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 py-32 sm:py-40 overflow-hidden">
        <IceParticles />
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
        <ScrollReveal>
          <h1 className="frost-text-shimmer text-5xl sm:text-7xl font-bold tracking-wider uppercase mb-4 relative z-10">
            Frost Levelz
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <p className="text-lg text-foreground/60 max-w-md mb-8 relative z-10">
            Hip-Hop &amp; Rap straight from Brixton, London. Buy music directly from the artist.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.4}>
          <a
            href="#music"
            className="bg-accent text-background font-semibold px-8 py-3 rounded-full hover:bg-accent/80 transition-colors relative z-10 frost-btn"
          >
            Browse Music
          </a>
        </ScrollReveal>
      </section>

      {/* Albums Section */}
      <section id="music" className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-16">
        <ScrollReveal>
          <h2 className="frost-heading text-2xl font-bold mb-8 uppercase tracking-wide">Albums</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums === undefined ? (
            <div className="text-foreground/30 text-sm">Loading...</div>
          ) : albums.length === 0 ? (
            <div className="text-foreground/30 text-sm">No albums yet</div>
          ) : (
            albums.map((album, i) => (
              <ScrollReveal key={album._id} delay={i * 0.15}>
              <div
                className="bg-surface rounded-xl overflow-hidden border border-border hover:border-accent/40 transition-colors group"
              >
                <div className="aspect-square bg-surface-light flex items-center justify-center overflow-hidden">
                  {album.coverImageUrl ? (
                    <img
                      src={album.coverImageUrl}
                      alt={album.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl text-accent/30 group-hover:text-accent/50 transition-colors">
                      &diams;
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm truncate">{album.title}</h3>
                  <p className="text-foreground/50 text-xs mt-1">
                    {album.year} &middot; {album.trackCount} tracks
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-col">
                      <span className="text-accent font-bold">
                        &pound;{album.priceMp3.toFixed(2)} MP3
                      </span>
                      <span className="text-accent/70 text-xs">
                        &pound;{album.priceWav.toFixed(2)} WAV
                      </span>
                    </div>
                    <BuyButton
                      albumId={album._id}
                      priceMp3={album.priceMp3}
                      priceWav={album.priceWav}
                      variant="primary"
                    />
                  </div>
                </div>
              </div>
              </ScrollReveal>
            ))
          )}
        </div>

        {/* Album Tracklist */}
        {albumTracks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-foreground/50 text-sm font-semibold uppercase tracking-wide mb-3">
              Tracklist
            </h3>
            <div className="flex flex-col gap-1">
              {albumTracks
                .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
                .map((track) => (
                  <div
                    key={track._id}
                    className="flex items-center gap-3 bg-surface/50 rounded-lg px-4 py-2.5 border border-border/50 hover:border-accent/30 transition-colors"
                  >
                    <span className="text-foreground/25 text-xs w-5 text-right font-mono">
                      {track.trackNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{track.title}</h4>
                    </div>
                    {track.previewUrl && (
                      <AudioPlayer
                        src={track.previewUrl}
                        trackId={track._id}
                        currentlyPlaying={currentlyPlaying}
                        onPlay={setCurrentlyPlaying}
                      />
                    )}
                    <span className="text-accent/70 text-xs font-mono">
                      &pound;{track.priceMp3.toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* Singles Section */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-16">
        <ScrollReveal>
          <h2 className="frost-heading text-2xl font-bold mb-8 uppercase tracking-wide">Singles</h2>
        </ScrollReveal>
        <StaggerContainer className="flex flex-col gap-2">
          {tracks === undefined ? (
            <div className="text-foreground/30 text-sm">Loading...</div>
          ) : singles.length === 0 ? (
            <div className="text-foreground/30 text-sm">No singles yet</div>
          ) : (
            singles.map((track, i) => (
              <StaggerItem key={track._id}>
              <div
                className="flex items-center gap-4 bg-surface rounded-lg px-4 py-3 border border-border hover:border-accent/40 transition-colors group"
              >
                <span className="text-foreground/30 text-sm w-6 text-right">
                  {i + 1}
                </span>
                {track.coverImageUrl && (
                  <img
                    src={track.coverImageUrl}
                    alt={track.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{track.title}</h3>
                  <p className="text-foreground/40 text-xs">{track.year}</p>
                </div>
                {track.previewUrl && (
                  <AudioPlayer
                    src={track.previewUrl}
                    trackId={track._id}
                    currentlyPlaying={currentlyPlaying}
                    onPlay={setCurrentlyPlaying}
                  />
                )}
                <span className="text-accent font-semibold text-sm">
                  &pound;{track.priceMp3.toFixed(2)}
                </span>
                <BuyButton
                  trackId={track._id}
                  priceMp3={track.priceMp3}
                  priceWav={track.priceWav}
                />
              </div>
              </StaggerItem>
            ))
          )}
        </StaggerContainer>
      </section>

      {/* About Section */}
      <section id="about" className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-16">
        <ScrollReveal>
          <h2 className="frost-heading text-2xl font-bold mb-8 uppercase tracking-wide">About</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
        <div className="bg-surface rounded-xl border border-border p-6 sm:p-8">
          <p className="text-foreground/70 leading-relaxed">
            Frost Levelz is a hip-hop and rap artist from Brixton, London. With early musical
            memories of his big brother DJing house &amp; garage back in Brixton, Frost Levelz
            brings a unique blend of gritty lyricism and melodic influences. His catalog spans
            hip-hop, soul, R&amp;B, and beyond &mdash; always authentic, always direct from the
            source.
          </p>
        </div>
        </ScrollReveal>
      </section>

      {/* Socials Section */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-16">
        <ScrollReveal>
          <h2 className="frost-heading text-2xl font-bold mb-8 uppercase tracking-wide">Follow</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a
            href="https://www.instagram.com/frostlevelz_daartist/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-6 text-center hover:border-accent/40 transition-colors group"
          >
            <svg className="w-8 h-8 mx-auto mb-3 text-foreground/50 group-hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">Instagram</span>
          </a>
          <a
            href="https://music.apple.com/us/artist/frost-levelz/1576391795"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-6 text-center hover:border-accent/40 transition-colors group"
          >
            <svg className="w-8 h-8 mx-auto mb-3 text-foreground/50 group-hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.862.358-1.31.083-.575.11-1.15.112-1.728.002-4.006.002-8.012 0-12.018zm-7.14 9.926a.612.612 0 01-.612.63c-1.07-.006-2.14 0-3.21-.002v.006h-2.88c-1.067 0-2.135.003-3.202-.002a.618.618 0 01-.619-.627V7.95c0-.356.267-.63.617-.632h9.29c.348 0 .617.273.617.63v7.502h-.001z"/><path d="M18.09 11.295c0-.801-.313-1.49-.882-2.063a3.066 3.066 0 00-.914-.637 3.099 3.099 0 00-1.36-.295c-.255.002-.503.04-.745.108a5.243 5.243 0 00-.478.175c-.157.063-.309.14-.468.2a.996.996 0 01-.37.072.988.988 0 01-.378-.078c-.155-.06-.303-.134-.455-.197a3.9 3.9 0 00-.491-.17 2.707 2.707 0 00-.67-.082c-.88.006-1.62.307-2.237.886-.624.586-.932 1.32-.938 2.173 0 .42.087.823.236 1.212.24.624.59 1.186.988 1.717.346.462.73.893 1.13 1.31.256.267.525.52.824.738.17.124.35.23.55.296.27.09.527.063.78-.063.14-.072.27-.16.395-.252.197-.143.395-.283.61-.398.3-.163.614-.237.95-.208.236.02.453.098.66.207.21.113.404.25.596.39.13.098.266.187.41.264.24.13.49.165.752.085.198-.06.373-.167.538-.292.3-.225.57-.48.825-.754.395-.423.77-.862 1.11-1.328.39-.537.728-1.104.96-1.73.145-.39.228-.79.227-1.206z"/></svg>
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">Apple Music</span>
          </a>
          <a
            href="https://soundcloud.com/london-houndz-recordingz"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-6 text-center hover:border-accent/40 transition-colors group"
          >
            <svg className="w-8 h-8 mx-auto mb-3 text-foreground/50 group-hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.057-.049-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.282c.013.06.045.094.104.094.057 0 .09-.037.104-.094l.21-1.282-.21-1.332c-.014-.057-.047-.094-.104-.094m1.783-.373c-.065 0-.107.043-.112.104l-.218 2.7.218 2.568c.005.06.047.104.112.104.065 0 .107-.044.113-.104l.244-2.568-.244-2.7c-.006-.06-.048-.104-.113-.104m.867-.618c-.069 0-.114.05-.118.115l-.207 3.322.207 3.145c.004.065.049.117.118.117s.114-.052.12-.117l.229-3.145-.229-3.322c-.006-.065-.051-.115-.12-.115m.882-.419c-.074 0-.12.053-.125.122l-.192 3.737.192 3.457c.005.07.051.122.125.122.072 0 .116-.052.123-.122l.218-3.457-.218-3.737c-.007-.07-.051-.122-.123-.122m.895-.226c-.078 0-.127.058-.132.131l-.178 3.96.178 3.592c.005.073.054.131.132.131.076 0 .122-.058.129-.131l.203-3.592-.203-3.96c-.007-.073-.053-.131-.129-.131m.899-.058c-.082 0-.133.062-.137.14l-.163 4.021.163 3.677c.004.078.055.14.137.14.082 0 .131-.062.138-.14l.185-3.677-.185-4.021c-.007-.078-.056-.14-.138-.14m2.651-1.597c-.013-.084-.062-.146-.147-.146-.083 0-.135.062-.146.146l-.139 5.559.139 3.758c.011.087.063.146.146.146.085 0 .134-.059.147-.146l.158-3.758-.158-5.559m.757-.637c-.088 0-.143.068-.151.155l-.122 6.187.122 3.809c.008.086.063.155.151.155s.142-.069.152-.155l.14-3.809-.14-6.187c-.01-.087-.064-.155-.152-.155m.908-.225c-.093 0-.15.074-.157.164l-.108 6.405.108 3.838c.007.09.064.164.157.164.092 0 .148-.074.157-.164l.123-3.838-.123-6.405c-.009-.09-.065-.164-.157-.164m.88-.105c-.096 0-.154.078-.161.172l-.093 6.498.093 3.854c.007.094.065.172.161.172.095 0 .153-.078.162-.172l.107-3.854-.107-6.498c-.009-.094-.067-.172-.162-.172m.856.08c-.1 0-.16.082-.166.18l-.078 6.409.078 3.855c.006.098.066.18.166.18.098 0 .158-.082.167-.18l.09-3.855-.09-6.41c-.009-.097-.069-.179-.167-.179m2.69-1.613c-.006-.105-.07-.19-.176-.19-.103 0-.17.085-.176.19l-.063 7.844.063 3.848c.006.105.073.19.176.19.106 0 .17-.085.176-.19l.071-3.848-.071-7.844m.893.365c-.11 0-.178.092-.183.2l-.048 7.265.048 3.84c.005.107.073.2.183.2.107 0 .175-.093.183-.2l.055-3.84-.055-7.265c-.008-.108-.076-.2-.183-.2m.88-.32c-.113 0-.184.098-.19.21l-.034 7.577.034 3.827c.006.113.077.21.19.21.113 0 .183-.097.19-.21l.039-3.827-.039-7.577c-.007-.112-.077-.21-.19-.21m.87.405c-.116 0-.19.104-.195.221l-.019 6.94.019 3.815c.005.116.079.221.195.221.116 0 .189-.105.196-.221l.022-3.815-.022-6.94c-.007-.117-.08-.221-.196-.221m2.49 3.397c-.232 0-.422.188-.422.42v7.13c0 .233.19.422.422.422h.084c1.103 0 2.166-.183 3.156-.522a8.506 8.506 0 003.751-2.594 8.465 8.465 0 001.694-4.048c.063-.395.088-.676.088-.956a4.453 4.453 0 00-4.452-4.452 4.424 4.424 0 00-4.32 3.6"/></svg>
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">SoundCloud</span>
          </a>
          <a
            href="https://www.facebook.com/frostlevelz/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-6 text-center hover:border-accent/40 transition-colors group"
          >
            <svg className="w-8 h-8 mx-auto mb-3 text-foreground/50 group-hover:text-accent transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">Facebook</span>
          </a>
        </div>
        </ScrollReveal>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-16">
        <ScrollReveal>
          <h2 className="frost-heading text-2xl font-bold mb-8 uppercase tracking-wide">Contact</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
        <div className="bg-surface rounded-xl border border-border p-6 sm:p-8 text-center">
          <p className="text-foreground/70 mb-4">
            For bookings, licensing, and enquiries:
          </p>
          <a
            href="mailto:Frostlevelmanagement@gmail.com"
            className="text-accent hover:underline"
          >
            Frostlevelmanagement@gmail.com
          </a>
        </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
