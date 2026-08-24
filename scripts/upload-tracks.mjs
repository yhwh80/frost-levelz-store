import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import fs from "fs";
import path from "path";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://tame-rhinoceros-143.eu-west-1.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

// Map: filename -> track title (must match what's in the database)
const FILE_TO_TRACK = {
  // Singles
  "eMasteredLONDONTOWNFROSTLEVELZFTANTRAXXdistroreadyMIX.mp3": "London Town (feat. Antraxx Da Outlaw)",
  "eMasteredseemeballinTRIALFROSTLEVELZ.mp3": "See Me Ballin",
  "eMasteredcashindaattic.mp3": "Cash In The Attic",
  "eMasteredFEELINAWAYFREESTYLEFROSTLEVELZ.mp3": "Feelin A Way",
  "IGETITFrostLevelzmastred.mp3": "I Get It",
  "eMasteredAuviAuviishdesignersFtFrostLevelz.mp3": "Wavey (with Ish Designer)",
  "YOUGOTITdoneFROSTLEVELZFTAVrampmix.mp3": "You Got It!! (feat. Ayve)",
  "eMasteredSHALOMlatestFROSTLEVELZPRODBYTERAHDANGBEATS.mp3": "Shalom (feat. Deeavelidon)",
  "2023STREETSKEEPCALLINGFROSTLEVELZ1.mp3": "Streetz Keep Callin",
  "WAITINFROSTLEVELZ1.mp3": "No More Waitin",
  "eMasteredKAPPASFROSTLEVELZPRODBYMUSICFIRE.mp3": "Kappin",
  "eMasteredDAMESSAGEFROSTLEVELZF.L.I.GROUP.mp3": "Da Message",
  "eMasteredIDidntMeanIt2023.mp3": "I Didn't Mean It",
  "NOFUCKSGIVENFROSTLEVELZF.L.I.GROUP.mp3": "No #uckz Given",
  "NOFUCKSGIVENcleanversionFROSTLEVELZF.L.I.GROUP.mp3": "No #uckz Given [Clean]",
  "eMasteredBORNINTHESTREETSFREESTYLEFROSTLEVELZ.mp3": "Born In Da Streetz",
  "FROSTYSICKLISTPRODBYFROSTLEVELZ.mp3": "Sick List",
  "SmileMumLilMichealFtLilMogul.mp3": "Mum Smile (Lil Micheal feat. Lil Mogul)",
  "WHERERUNOW22FROSTLEVELZFTAV.mp3": "Where R U Now?! (feat. Ayve)",
  "eMasteredDOUBTMEdoneTERAHDANGXSTYLERRHYMESFLIGROUPEXCLUSIVE.mp3": "Doubt Me (Styler Rhymes)",
  "eMasteredLATECHANGESFROSTFTDEEAVELIDONF.L.I.GROUPVERSEREADY.mp3": "Late Changes (feat. Deeavelidon)",
  "eMasteredSTILLFREESTYLEFROSTLEVELZf.l.i.groupcopy.mp3": "Still Freestyle",
  "eMasteredTHEYWASNTWITHUSFROSTLEVELZPRODBY.MUSICFIRE.mp3": "They Wasn't With Us",
  "MasterLookinforagangsta.mp3": "Lookin For A Gangsta [Kev Mix]",
  "MasterSumthinSpecialsoulmix.mp3": "Sexy Something Special [Soul Mix]",
  "MasterSumthinspeacialhousemix1.mp3": "Sexy Something Special [House Mix]",
  // Album tracks (Ghost-Writer)
  "MasterOnMyGrind.mp3": "On My Grind (feat. Frost A.i)",
  "MasterLOOKIN4AGANGSTARAPMIX.mp3": "Lookin For A Gangsta (feat. Frost A.i) [Rap Mix]",
  "MasterTakemytimepopmix1.mp3": "Take My Time (feat. Frost A.i) [Pop Mix]",
  "Masterchaseecstasyfrostlevelzftfrostai.mp3": "Chase Ecstasy (feat. Frost A.i)",
  "Masterphoneysurbanmix.mp3": "Phoney's (feat. Frost A.i) [Urban Mix]",
  "MasterOntheothersidemumsong.mp3": "On The Other Side (feat. Frost A.i)",
  "MasterTAKEMEAWAY.mp3": "Take Me Away (feat. Frost A.i)",
  "MasterIbeensearchinrnbmix.mp3": "I Been Searching (feat. Frost A.i) [RnB Mix]",
  "Friend2me1.mp3": "Friend To Me (feat. Frost A.i) [Soul Mix]",
  "MasterCussincussinrapmix.mp3": "Cussin Cussin (feat. Frost A.i)",
  "Masterisitmyfaulthiphop.mp3": "Is It My Fault (feat. Frost A.i)",
  "Mastergettinithiphopmix.mp3": "Gettin It (feat. Frost A.i) [Hip Hop Mix]",
  "Masterslowusdownsoufulrnbmix.mp3": "Try Slow Us Down (feat. Frost A.i)",
};

// Note: Spaceship is a WAV file
const WAV_FILES = {
  "eMasteredSPACESHIPFROSTLEVELZFTAYVEETRACKDEALERfrostMIXHD.wav": "Spaceship (feat. Ayve)",
};

async function main() {
  console.log("Fetching track list from Convex...");
  const tracks = await convex.query(api.tracks.list, {});
  console.log(`Found ${tracks.length} tracks in database`);

  const titleToId = new Map();
  for (const track of tracks) {
    titleToId.set(track.title, track._id);
  }

  const tracksDir = path.join(process.cwd(), "tracks");

  // Upload MP3 files
  for (const [filename, title] of Object.entries(FILE_TO_TRACK)) {
    const trackId = titleToId.get(title);
    if (!trackId) {
      console.log(`⚠ No track found for: ${title}`);
      continue;
    }

    const filePath = path.join(tracksDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ File not found: ${filename}`);
      continue;
    }

    console.log(`Uploading: ${title}...`);

    // Get upload URL
    const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});

    // Upload file
    const fileData = fs.readFileSync(filePath);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "audio/mpeg" },
      body: fileData,
    });

    const { storageId } = await response.json();

    // Link to track
    await convex.mutation(api.files.linkFileToTrack, {
      trackId,
      storageId,
      field: "mp3FileId",
    });

    console.log(`✓ ${title}`);
  }

  // Upload WAV files
  for (const [filename, title] of Object.entries(WAV_FILES)) {
    const trackId = titleToId.get(title);
    if (!trackId) {
      console.log(`⚠ No track found for WAV: ${title}`);
      continue;
    }

    const filePath = path.join(tracksDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ WAV file not found: ${filename}`);
      continue;
    }

    console.log(`Uploading WAV: ${title}...`);

    const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});
    const fileData = fs.readFileSync(filePath);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: fileData,
    });

    const { storageId } = await response.json();

    await convex.mutation(api.files.linkFileToTrack, {
      trackId,
      storageId,
      field: "wavFileId",
    });

    console.log(`✓ WAV: ${title}`);
  }

  console.log("\nDone! All tracks uploaded to Convex storage.");
}

main().catch(console.error);
