import { mutation } from "./_generated/server";

export const seedCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("tracks").first();
    if (existing) return "Already seeded";

    // === ALBUM: GHOST-WRITER (15 tracks) ===
    const albumId = await ctx.db.insert("albums", {
      title: "GHOST-WRITER (feat. Frost A.I)",
      year: "2025",
      trackCount: 15,
      priceMp3: 7.99,
      priceWav: 11.99,
      coverImageUrl: "/covers/ghost-writer.jpg",
      description:
        "F.L.I Group presents Ghost-Writer — Frost Levelz ft Frost A.I. Written & composed by Frost Level Investment Group. Released November 19, 2025.",
      released: true,
    });

    // Ghost-Writer album tracks
    const albumTracks = [
      { title: "On My Grind (feat. Frost A.i)", trackNumber: 1, previewUrl: "/previews/gw-01-on-my-grind.mp3" },
      { title: "Lookin For A Gangsta (feat. Frost A.i) [Rap Mix]", trackNumber: 2, previewUrl: "/previews/gw-02-lookin-for-a-gangsta.mp3" },
      { title: "Take My Time (feat. Frost A.i) [Pop Mix]", trackNumber: 3, previewUrl: "/previews/gw-03-take-my-time.mp3" },
      { title: "Chase Ecstasy (feat. Frost A.i)", trackNumber: 4, previewUrl: "/previews/gw-04-chase-ecstasy.mp3" },
      { title: "Phoney's (feat. Frost A.i) [Urban Mix]", trackNumber: 5, previewUrl: "/previews/gw-05-phoneys.mp3" },
      { title: "On The Other Side (feat. Frost A.i)", trackNumber: 6, previewUrl: "/previews/gw-06-on-the-other-side.mp3" },
      { title: "Take Me Away (feat. Frost A.i)", trackNumber: 7, previewUrl: "/previews/gw-07-take-me-away.mp3" },
      { title: "I Been Searching (feat. Frost A.i) [RnB Mix]", trackNumber: 8, previewUrl: "/previews/gw-08-i-been-searching.mp3" },
      { title: "Friend To Me (feat. Frost A.i) [Soul Mix]", trackNumber: 9, previewUrl: "/previews/gw-09-friend-to-me.mp3" },
      { title: "Something Special (feat. Frost A.i) [Soul Mix]", trackNumber: 10, previewUrl: "/previews/gw-10-something-special-soul.mp3" },
      { title: "Cussin Cussin (feat. Frost A.i)", trackNumber: 11, previewUrl: "/previews/gw-11-cussin-cussin.mp3" },
      { title: "Is It My Fault (feat. Frost A.i)", trackNumber: 12, previewUrl: "/previews/gw-12-is-it-my-fault.mp3" },
      { title: "Gettin It (feat. Frost A.i) [Hip Hop Mix]", trackNumber: 13, previewUrl: "/previews/gw-13-gettin-it.mp3" },
      { title: "Try Slow Us Down (feat. Frost A.i)", trackNumber: 14, previewUrl: "/previews/gw-14-try-slow-us-down.mp3" },
      { title: "Something Special (feat. Frost A.i) [House Mix]", trackNumber: 15, previewUrl: "/previews/gw-15-something-special-house.mp3" },
    ];

    for (const track of albumTracks) {
      await ctx.db.insert("tracks", {
        title: track.title,
        year: "2025",
        priceMp3: 1.29,
        priceWav: 1.99,
        albumId,
        trackNumber: track.trackNumber,
        coverImageUrl: "/covers/ghost-writer.jpg",
        previewUrl: track.previewUrl,
        released: true,
      });
    }

    // === SINGLES ===
    const singles = [
      { title: "London Town (feat. Antraxx Da Outlaw)", year: "2026", coverImageUrl: "/covers/london-town.jpg", previewUrl: "/previews/london-town.mp3" },
      { title: "Where R U Now?! (feat. Ayve)", year: "2025", coverImageUrl: "/covers/where-r-u-now.png", previewUrl: "/previews/where-r-u-now.mp3" },
      { title: "See Me Ballin", year: "2025", coverImageUrl: "/covers/see-me-ballin.jpg", previewUrl: "/previews/see-me-ballin.mp3" },
      { title: "Cash In The Attic", year: "2025", coverImageUrl: "/covers/cash-in-the-attic.jpg", previewUrl: "/previews/cash-in-the-attic.mp3" },
      { title: "Feelin A Way", year: "2025", coverImageUrl: "/covers/feelin-a-way.jpg", previewUrl: "/previews/feelin-a-way.mp3" },
      { title: "Doubt Me (Styler Rhymes)", year: "2025", coverImageUrl: "/covers/doubt-me.png", previewUrl: "/previews/doubt-me.mp3" },
      { title: "I Get It", year: "2024", coverImageUrl: "/covers/i-get-it.jpg", previewUrl: "/previews/i-get-it.mp3" },
      { title: "Wavey (with Ish Designer)", year: "2024", coverImageUrl: "/covers/wavey.jpg", previewUrl: "/previews/wavey.mp3" },
      { title: "Spaceship (feat. Ayve)", year: "2024", coverImageUrl: "/covers/spaceship.jpg", previewUrl: "/previews/spaceship.mp3" },
      { title: "You Got It!! (feat. Ayve)", year: "2024", coverImageUrl: "/covers/you-got-it.jpg", previewUrl: "/previews/you-got-it.mp3" },
      { title: "Sexy Something Special [Soul Mix]", year: "2024", coverImageUrl: "/covers/sexy-something-special.jpg", previewUrl: "/previews/sexy-something-special-soul.mp3" },
      { title: "Sexy Something Special [House Mix]", year: "2024", coverImageUrl: "/covers/sexy-something-special.jpg", previewUrl: "/previews/sexy-something-special-house.mp3" },
      { title: "Shalom (feat. Deeavelidon)", year: "2024", coverImageUrl: "/covers/shalom.jpg", previewUrl: "/previews/shalom.mp3" },
      { title: "Late Changes (feat. Deeavelidon)", year: "2024", coverImageUrl: "/covers/late-changes.png", previewUrl: "/previews/late-changes.mp3" },
      { title: "Streetz Keep Callin", year: "2023", coverImageUrl: "/covers/streetz-keep-callin.jpg", previewUrl: "/previews/streetz-keep-callin.mp3" },
      { title: "No More Waitin", year: "2023", coverImageUrl: "/covers/no-more-waitin.jpg", previewUrl: "/previews/no-more-waitin.mp3" },
      { title: "Kappin", year: "2023", coverImageUrl: "/covers/kappin.jpg", previewUrl: "/previews/kappin.mp3" },
      { title: "Da Message", year: "2023", coverImageUrl: "/covers/da-message.jpg", previewUrl: "/previews/da-message.mp3" },
      { title: "I Didn't Mean It", year: "2023", coverImageUrl: "/covers/i-didnt-mean-it.jpg", previewUrl: "/previews/i-didnt-mean-it.mp3" },
      { title: "They Wasn't With Us", year: "2023", coverImageUrl: "/covers/they-wasnt-with-us.png", previewUrl: "/previews/they-wasnt-with-us.mp3" },
      { title: "Still Freestyle", year: "2023", coverImageUrl: "/covers/still.png", previewUrl: "/previews/still.mp3" },
      { title: "No #uckz Given", year: "2022", coverImageUrl: "/covers/no-fuckz-given.jpg", previewUrl: "/previews/no-fuckz-given.mp3" },
      { title: "No #uckz Given [Clean]", year: "2022", coverImageUrl: "/covers/no-fuckz-given-clean.png", previewUrl: "/previews/no-fuckz-given-clean.mp3" },
      { title: "Born In Da Streetz", year: "2022", coverImageUrl: "/covers/born-in-da-streetz.jpg", previewUrl: "/previews/born-in-da-streetz.mp3" },
      { title: "Sick List", year: "2021", coverImageUrl: "/covers/sick-list.jpg", previewUrl: "/previews/sick-list.mp3" },
      { title: "Mum Smile (Lil Micheal feat. Lil Mogul)", year: "2025", coverImageUrl: "/covers/mum-smile.jpg", previewUrl: "/previews/mum-smile.mp3" },
      { title: "Lookin For A Gangsta [Kev Mix]", year: "2024", coverImageUrl: "/covers/lookin-4-a-gangsta.png", previewUrl: "/previews/lookin-4-a-gangsta.mp3" },
    ];

    for (const single of singles) {
      await ctx.db.insert("tracks", {
        title: single.title,
        year: single.year,
        priceMp3: 1.29,
        priceWav: 1.99,
        coverImageUrl: single.coverImageUrl,
        previewUrl: single.previewUrl,
        released: true,
      });
    }

    return `Seeded with 1 album (${albumTracks.length} tracks) and ${singles.length} singles`;
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
