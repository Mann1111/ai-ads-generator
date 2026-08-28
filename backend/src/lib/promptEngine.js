import { getStyle } from "./styles.js";
import { getFormat } from "./formats.js";
import { getAngle } from "./angles.js";

/**
 * Turns (product category + mode + style + format) into a well-formed
 * generation prompt. This is the seam a real image-generation provider
 * would consume — swap MockImageAdProvider for a real one and this same
 * prompt gets sent to it.
 */
export function buildImagePrompt({ category, mode, addModel, style, formatId }) {
  const styleDef = getStyle(style);
  const format = getFormat(formatId);
  const modelClause =
    mode === "with-model"
      ? "a human model naturally interacting with the product, realistic pose and proportions, matched lighting"
      : addModel
      ? "add a photorealistic human model naturally holding/wearing/using the product, matched lighting and scale, no uncanny valley artifacts"
      : "no human model, product-only composition";

  return [
    `Advertising photo for a ${category || "consumer"} product.`,
    styleDef.promptFragment + ".",
    modelClause + ".",
    `Composition optimized for ${format.label} (${format.platforms.join(", ")}).`,
    "High resolution, sharp focus on product, ad-ready, no watermarks, no extraneous text unless it is a deliberate promotional callout.",
  ].join(" ");
}

/**
 * Prompt for the video provider: hook / body / CTA structure per the
 * course's Module 5 conventions, tailored to the chosen style + format +
 * marketing angle. The angle's Khmer dialogue lines are included verbatim
 * as the required on-screen text (or spoken voiceover script, for a
 * provider that supports audio) — a real provider should render/speak
 * exactly this Khmer copy rather than inventing or translating its own.
 */
export function buildVideoPrompt({ category, mode, addModel, style, formatId, angleId }) {
  const styleDef = getStyle(style);
  const format = getFormat(formatId);
  const angle = getAngle(angleId);
  const modelClause =
    mode === "with-model" || addModel
      ? "featuring the model interacting with the product"
      : "featuring the product alone with dynamic camera movement (rotation, slow push-in)";

  return [
    `Short vertical/format-appropriate video ad for a ${category || "consumer"} product, ${format.label}.`,
    `Style: ${styleDef.label} — ${styleDef.promptFragment}.`,
    `Marketing angle: ${angle.label} — ${angle.description}`,
    `Hook (0-2s): immediate visual interest, ${modelClause}. On-screen/spoken dialogue (Khmer, use verbatim): "${angle.hook}"`,
    `Body (2-4s): clear view of the product's key selling point, smooth camera motion, on-brand pacing. On-screen/spoken dialogue (Khmer, use verbatim): "${angle.body}"`,
    `CTA (4-6s): text overlay with a clear call to action. On-screen/spoken dialogue (Khmer, use verbatim): "${angle.cta}"`,
    "All on-screen text and any spoken dialogue must be in natural, correctly-spelled Khmer — no English/Latin text or machine-translated phrasing.",
  ].join(" ");
}
