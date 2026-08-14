import { mutation } from "./_generated/server";

export const seedCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("tracks").first();
    if (existing) return "Already seeded";

    // === ALBUM ===
    const albumId = await ctx.db.insert("albums", {
      title: "GHOST-WRITER (feat. Frost A.I)",
      year: "2025",
      trackCount: 12,
      priceMp3: 7.99,
      priceWav: 11.99,
      coverImageUrl: "/covers/ghost-writer.jpg",
      description:
        "F.L.I Group presents Ghost-Writer — Frost Levelz ft Frost A.I. Written & composed by Frost Level Investment Group.",
      released: true,
    });

    // === SINGLES ===
    const singles = [
      {
        title: "London Town (feat. Antraxx Da Outlaw)",
        year: "2026",
        coverImageUrl: "/covers/london-town.jpg",
      },
      {
        title: "See Me Ballin",
        year: "2025",
        coverImageUrl: "/covers/see-me-ballin.jpg",
      },
      {
        title: "Cash In The Attic",
        year: "2025",
        coverImageUrl: "/covers/cash-in-the-attic.jpg",
      },
      {
        title: "Feelin A Way",
        year: "2025",
        coverImageUrl: "/covers/feelin-a-way.jpg",
      },
      {
        title: "I Get It",
        year: "2024",
        coverImageUrl: "/covers/i-get-it.jpg",
      },
      {
        title: "Wavey (with Ish Designer)",
        year: "2024",
        coverImageUrl: "/covers/wavey.jpg",
      },
      {
        title: "Spaceship (feat. Ayve)",
        year: "2024",
        coverImageUrl: "/covers/spaceship.jpg",
      },
      {
        title: "You Got It!! (feat. Ayve)",
        year: "2024",
        coverImageUrl: "/covers/you-got-it.jpg",
      },
      {
        title: "Lady You Got It!! (feat. Ayve)",
        year: "2024",
        coverImageUrl: "/covers/lady-you-got-it.jpg",
      },
      {
        title: "Sexy Something Special",
        year: "2024",
        coverImageUrl: "/covers/sexy-something-special.jpg",
      },
      {
        title: "Shalom (feat. Deeavelidon)",
        year: "2024",
        coverImageUrl: "/covers/shalom.jpg",
      },
      {
        title: "Streetz Keep Callin",
        year: "2023",
        coverImageUrl: "/covers/streetz-keep-callin.jpg",
      },
      {
        title: "No More Waitin",
        year: "2023",
        coverImageUrl: "/covers/no-more-waitin.jpg",
      },
      {
        title: "Kappin",
        year: "2023",
        coverImageUrl: "/covers/kappin.jpg",
      },
      {
        title: "Da Message",
        year: "2023",
        coverImageUrl: "/covers/da-message.jpg",
      },
      {
        title: "I Didn't Mean It",
        year: "2023",
        coverImageUrl: "/covers/i-didnt-mean-it.jpg",
      },
      {
        title: "No #uckz Given",
        year: "2022",
        coverImageUrl: "/covers/no-fuckz-given.jpg",
      },
      {
        title: "Born In Da Streetz",
        year: "2022",
        coverImageUrl: "/covers/born-in-da-streetz.jpg",
      },
      {
        title: "Sick List",
        year: "2021",
        coverImageUrl: "/covers/sick-list.jpg",
      },
      {
        title: "Mum Smile (Lil Micheal feat. Lil Mogul)",
        year: "2025",
        coverImageUrl: "/covers/mum-smile.jpg",
      },
    ];

    for (const single of singles) {
      await ctx.db.insert("tracks", {
        title: single.title,
        year: single.year,
        priceMp3: 1.29,
        priceWav: 1.99,
        coverImageUrl: single.coverImageUrl,
        released: true,
      });
    }

    return `Seeded with 1 album and ${singles.length} singles`;
  },
});

export const clearCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    for (const track of tracks) {
      await ctx.db.delete(track._id);
    }
    const albums = await ctx.db.query("albums").collect();
    for (const album of albums) {
      await ctx.db.delete(album._id);
    }
    return `Cleared ${tracks.length} tracks and ${albums.length} albums`;
  },
});
