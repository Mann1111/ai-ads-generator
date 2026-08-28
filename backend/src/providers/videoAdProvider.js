import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { STORAGE_DIR } from "../lib/storage.js";
import { getFormat } from "../lib/formats.js";
import { getStyle } from "../lib/styles.js";
import { getAngle } from "../lib/angles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundled directly in the repo (backend/assets/fonts) so Khmer captions
// render correctly with zero setup on any host — ffmpeg's `subtitles`
// filter is pointed at this directory via `fontsdir`, so it doesn't depend
// on the OS having Khmer fonts installed/registered with fontconfig.
const FONTS_DIR = path.resolve(__dirname, "../../assets/fonts");
const KHMER_FONT_FAMILY = "Noto Sans Khmer";

/**
 * VideoAdProvider interface
 * --------------------------------
 * Any real provider (e.g. an image-to-video generation API) should implement:
 *
 *   async generate({ sourceImagePath, prompt, styleId, formatId, angleId, onProgress }) : Promise<{ filePath }>
 *
 * `angleId` selects one of the 5 fixed marketing angles (see lib/angles.js),
 * each of which carries its own Khmer hook/body/CTA dialogue. A real
 * image-to-video / text-to-video provider should treat that dialogue as the
 * required on-screen text (or spoken voiceover script, if the provider
 * supports audio) — see buildVideoPrompt() in lib/promptEngine.js, which
 * already folds the angle's Khmer lines into the generation prompt.
 *
 * This is called from an async job (see lib/jobQueue.js) because real
 * video-generation APIs are typically slow (tens of seconds to minutes) and
 * often expose a submit + poll or webhook pattern rather than a single
 * synchronous call. The mock implementation below simulates that same
 * async shape, but produces a REAL playable .mp4 — a Ken Burns pan/zoom over
 * the generated static ad image, with the angle's 3-beat Khmer dialogue
 * burned in as timed captions — using ffmpeg, so the full flow (including
 * genuine Khmer text shaping) can be demoed end-to-end with no API keys.
 */
export class VideoAdProvider {
  async generate(_params) {
    throw new Error("Not implemented — use a concrete provider (e.g. MockVideoAdProvider).");
  }
}

export class MockVideoAdProvider extends VideoAdProvider {
  async generate({ sourceImagePath, styleId, formatId, angleId, angleIndex = 0, prompt }) {
    const style = getStyle(styleId);
    const format = getFormat(formatId);
    const angle = getAngle(angleId);

    const beatSeconds = 2;
    const duration = beatSeconds * 3; // hook + body + CTA
    const fps = 30;

    // ffmpeg's zoompan needs a source frame at least as large as the target;
    // upscale a bit first so the zoom has room to move without pixelating.
    const upscaled = path.join(STORAGE_DIR, "generated", `video-src-${nanoid(6)}.png`);
    await sharp(sourceImagePath)
      .resize({ width: format.width * 2, height: format.height * 2, fit: "cover" })
      .toFile(upscaled);

    const fileName = `ad-video-${angle.id}-${nanoid(8)}.mp4`;
    const outPath = path.join(STORAGE_DIR, "generated", fileName);
    const assPath = path.join(STORAGE_DIR, "generated", `captions-${nanoid(8)}.ass`);

    await fs.writeFile(assPath, buildAssSubtitles({ format, angle, beatSeconds }), "utf8");

    // Alternate zoom direction by angle so a batch of 5 doesn't look
    // identical — even angle indexes push in, odd ones start pushed in and
    // ease back out.
    const zoompan =
      angleIndex % 2 === 0
        ? `zoompan=z='min(zoom+0.0015,1.15)':d=${duration * fps}:s=${format.width}x${format.height}:fps=${fps}`
        : `zoompan=z='if(eq(on,0),1.15,max(zoom-0.0015,1.0))':d=${duration * fps}:s=${format.width}x${format.height}:fps=${fps}`;

    // fontsdir is escaped Windows-style (":" -> "\:") the same way the ass
    // path itself needs it in ffmpeg filter-graph syntax on any OS.
    const escapedAssPath = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    const escapedFontsDir = FONTS_DIR.replace(/\\/g, "/").replace(/:/g, "\\:");
    const subtitles = `subtitles=${escapedAssPath}:fontsdir=${escapedFontsDir}`;

    const filter = `${zoompan},${subtitles},fade=t=in:st=0:d=0.4,fade=t=out:st=${duration - 0.4}:d=0.4`;

    try {
      await runFfmpeg([
        "-y",
        "-loop",
        "1",
        "-i",
        upscaled,
        "-t",
        String(duration),
        "-vf",
        filter,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        outPath,
      ]);
    } finally {
      // Best-effort cleanup of the intermediate files; a failure here should
      // never mask the real ffmpeg result/error.
      await fs.unlink(upscaled).catch(() => {});
      await fs.unlink(assPath).catch(() => {});
    }

    return {
      filePath: outPath,
      publicPath: `/assets/generated/${fileName}`,
      durationSeconds: duration,
      width: format.width,
      height: format.height,
      angleId: angle.id,
      angleLabel: angle.label,
      dialogue: { hook: angle.hook, body: angle.body, cta: angle.cta },
      promptUsed: prompt,
      providerNote:
        "Generated by MockVideoAdProvider (local ffmpeg pan/zoom + Khmer caption overlay, not a real AI video model). Replace with a real image-to-video generation provider for production — see README.",
    };
  }
}

/**
 * Builds an .ass subtitle file with the angle's 3-beat Khmer dialogue
 * (hook / body / CTA), timed sequentially across the clip. Burning Khmer in
 * via ffmpeg's `subtitles` filter (libass, which shapes text through
 * HarfBuzz) — rather than the simpler `drawtext` filter — matters here:
 * drawtext draws glyphs in raw codepoint order with no complex-script
 * shaping, which mangles Khmer (misplaced vowel signs, broken subscript
 * consonants). libass shapes it correctly.
 */
function buildAssSubtitles({ format, angle, beatSeconds }) {
  const capSize = Math.max(20, Math.round(format.width * 0.065));
  const ctaSize = Math.max(24, Math.round(format.width * 0.078));
  const outline = Math.max(3, Math.round(format.width / 280));
  // Clears the mock image provider's bottom style-label band (~12% of
  // height) with room to spare, so the Khmer dialogue never crowds it —
  // a real image provider (no watermark band) would just get extra
  // breathing room instead.
  const marginV = Math.max(40, Math.round(format.height * 0.2));

  const t = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.round((seconds % 1) * 100);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  const line = (start, end, style, text) =>
    `Dialogue: 0,${t(start)},${t(end)},${style},,0,0,0,,{\\fad(250,250)}${escapeAssText(text)}`;

  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${format.width}`,
    `PlayResY: ${format.height}`,
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Cap,${KHMER_FONT_FAMILY},${capSize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,${outline},1,2,40,40,${marginV},1`,
    `Style: CTA,${KHMER_FONT_FAMILY},${ctaSize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,${outline},1,2,40,40,${marginV},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    line(0, beatSeconds, "Cap", angle.hook),
    line(beatSeconds, beatSeconds * 2, "Cap", angle.body),
    line(beatSeconds * 2, beatSeconds * 3, "CTA", angle.cta),
    "",
  ].join("\n");
}

function escapeAssText(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/\{/g, "(").replace(/\}/g, ")").replace(/\n/g, "\\N");
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-800)}`));
    });
    proc.on("error", reject);
  });
}
