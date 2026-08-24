import NodeID3 from "node-id3";
import fs from "fs";
import path from "path";

const tracksDir = path.join(process.cwd(), "tracks");
const coversDir = path.join(process.cwd(), "public", "covers");

// Map: MP3 filename -> { title, artist, cover filename }
const TRACK_META = {
  // Singles
  "eMasteredLONDONTOWNFROSTLEVELZFTANTRAXXdistroreadyMIX.mp3": { title: "London Town", artist: "Frost Levelz feat. Antraxx Da Outlaw", cover: "london-town.jpg" },
  "eMasteredseemeballinTRIALFROSTLEVELZ.mp3": { title: "See Me Ballin", artist: "Frost Levelz", cover: "see-me-ballin.jpg" },
  "eMasteredcashindaattic.mp3": { title: "Cash In The Attic", artist: "Frost Levelz", cover: "cash-in-the-attic.jpg" },
  "eMasteredFEELINAWAYFREESTYLEFROSTLEVELZ.mp3": { title: "Feelin A Way", artist: "Frost Levelz", cover: "feelin-a-way.jpg" },
  "IGETITFrostLevelzmastred.mp3": { title: "I Get It", artist: "Frost Levelz", cover: "i-get-it.jpg" },
  "eMasteredAuviAuviishdesignersFtFrostLevelz.mp3": { title: "Wavey", artist: "Ish Designer & Frost Levelz", cover: "wavey.jpg" },
  "YOUGOTITdoneFROSTLEVELZFTAVrampmix.mp3": { title: "You Got It!!", artist: "Frost Levelz feat. Ayve", cover: "you-got-it.jpg" },
  "eMasteredSHALOMlatestFROSTLEVELZPRODBYTERAHDANGBEATS.mp3": { title: "Shalom", artist: "Frost Levelz feat. Deeavelidon", cover: "shalom.jpg" },
  "2023STREETSKEEPCALLINGFROSTLEVELZ1.mp3": { title: "Streetz Keep Callin", artist: "Frost Levelz", cover: "streetz-keep-callin.jpg" },
  "WAITINFROSTLEVELZ1.mp3": { title: "No More Waitin", artist: "Frost Levelz", cover: "no-more-waitin.jpg" },
  "eMasteredKAPPASFROSTLEVELZPRODBYMUSICFIRE.mp3": { title: "Kappin", artist: "Frost Levelz", cover: "kappin.jpg" },
  "eMasteredDAMESSAGEFROSTLEVELZF.L.I.GROUP.mp3": { title: "Da Message", artist: "Frost Levelz", cover: "da-message.jpg" },
  "eMasteredIDidntMeanIt2023.mp3": { title: "I Didn't Mean It", artist: "Frost Levelz", cover: "i-didnt-mean-it.jpg" },
  "NOFUCKSGIVENFROSTLEVELZF.L.I.GROUP.mp3": { title: "No #uckz Given", artist: "Frost Levelz", cover: "no-fuckz-given.jpg" },
  "NOFUCKSGIVENcleanversionFROSTLEVELZF.L.I.GROUP.mp3": { title: "No #uckz Given (Clean)", artist: "Frost Levelz", cover: "no-fuckz-given-clean.png" },
  "eMasteredBORNINTHESTREETSFREESTYLEFROSTLEVELZ.mp3": { title: "Born In Da Streetz", artist: "Frost Levelz", cover: "born-in-da-streetz.jpg" },
  "FROSTYSICKLISTPRODBYFROSTLEVELZ.mp3": { title: "Sick List", artist: "Frost Levelz", cover: "sick-list.jpg" },
  "SmileMumLilMichealFtLilMogul.mp3": { title: "Mum Smile", artist: "Lil Micheal feat. Lil Mogul", cover: "mum-smile.jpg" },
  "WHERERUNOW22FROSTLEVELZFTAV.mp3": { title: "Where R U Now?!", artist: "Frost Levelz feat. Ayve", cover: "where-r-u-now.png" },
  "eMasteredDOUBTMEdoneTERAHDANGXSTYLERRHYMESFLIGROUPEXCLUSIVE.mp3": { title: "Doubt Me", artist: "Styler Rhymes", cover: "doubt-me.png" },
  "eMasteredLATECHANGESFROSTFTDEEAVELIDONF.L.I.GROUPVERSEREADY.mp3": { title: "Late Changes", artist: "Frost Levelz feat. Deeavelidon", cover: "late-changes.png" },
  "eMasteredSTILLFREESTYLEFROSTLEVELZf.l.i.groupcopy.mp3": { title: "Still Freestyle", artist: "Frost Levelz", cover: "still.png" },
  "eMasteredTHEYWASNTWITHUSFROSTLEVELZPRODBY.MUSICFIRE.mp3": { title: "They Wasn't With Us", artist: "Frost Levelz", cover: "they-wasnt-with-us.png" },
  "MasterLookinforagangsta.mp3": { title: "Lookin For A Gangsta (Kev Mix)", artist: "Frost Levelz", cover: "lookin-4-a-gangsta.png" },
  "MasterSumthinSpecialsoulmix.mp3": { title: "Sexy Something Special (Soul Mix)", artist: "Frost Levelz", cover: "sexy-something-special.jpg" },
  "MasterSumthinspeacialhousemix1.mp3": { title: "Sexy Something Special (House Mix)", artist: "Frost Levelz", cover: "sexy-something-special.jpg" },
  // Album tracks
  "MasterOnMyGrind.mp3": { title: "On My Grind", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "MasterLOOKIN4AGANGSTARAPMIX.mp3": { title: "Lookin For A Gangsta (Rap Mix)", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "MasterTakemytimepopmix1.mp3": { title: "Take My Time (Pop Mix)", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "Masterchaseecstasyfrostlevelzftfrostai.mp3": { title: "Chase Ecstasy", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "Masterphoneysurbanmix.mp3": { title: "Phoney's (Urban Mix)", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "MasterOntheothersidemumsong.mp3": { title: "On The Other Side", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "MasterTAKEMEAWAY.mp3": { title: "Take Me Away", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "MasterIbeensearchinrnbmix.mp3": { title: "I Been Searching (RnB Mix)", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "Friend2me1.mp3": { title: "Friend To Me (Soul Mix)", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "MasterCussincussinrapmix.mp3": { title: "Cussin Cussin", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "Masterisitmyfaulthiphop.mp3": { title: "Is It My Fault", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "Mastergettinithiphopmix.mp3": { title: "Gettin It (Hip Hop Mix)", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
  "Masterslowusdownsoufulrnbmix.mp3": { title: "Try Slow Us Down", artist: "Frost Levelz feat. Frost A.i", cover: "ghost-writer.jpg", album: "GHOST-WRITER" },
};

function getMimeType(filename) {
  if (filename.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [filename, meta] of Object.entries(TRACK_META)) {
    const filePath = path.join(tracksDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ File not found: ${filename}`);
      skipped++;
      continue;
    }

    const coverPath = path.join(coversDir, meta.cover);
    if (!fs.existsSync(coverPath)) {
      console.log(`⚠ Cover not found: ${meta.cover}`);
      skipped++;
      continue;
    }

    const tags = {
      title: meta.title,
      artist: meta.artist,
      album: meta.album || meta.title,
      genre: "Hip-Hop/Rap",
      publisher: "Frost Level Investment Group",
      image: {
        mime: getMimeType(meta.cover),
        type: { id: 3, name: "front cover" },
        description: "Cover",
        imageBuffer: fs.readFileSync(coverPath),
      },
    };

    const success = NodeID3.write(tags, filePath);
    if (success) {
      console.log(`✓ ${meta.title}`);
      updated++;
    } else {
      console.log(`✗ Failed: ${meta.title}`);
    }
  }

  console.log(`\nDone! ${updated} tracks tagged, ${skipped} skipped.`);
  console.log("\nNow re-upload the tagged files to Convex with:");
  console.log("  node scripts/upload-tracks.mjs");
}

main().catch(console.error);
