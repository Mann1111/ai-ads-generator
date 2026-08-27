// Ad style presets. Each style drives both the prompt-engine wording and the
// mock renderer's visual treatment, and is what the frontend shows as a
// pickable "style card" with a thumbnail.

export const STYLES = [
  {
    id: "minimalist",
    label: "Minimalist E-commerce",
    description: "Clean solid/soft-gradient background, product front and center, generous white space.",
    accent: "#F4F4F2",
    textColor: "#111111",
    promptFragment:
      "clean minimalist e-commerce product photography, soft studio background, " +
      "even lighting, product centered, generous negative space, no clutter",
  },
  {
    id: "lifestyle",
    label: "Lifestyle / In-Context",
    description: "Product shown in a realistic everyday setting that matches how it's actually used.",
    accent: "#E7D9C6",
    textColor: "#2B2118",
    promptFragment:
      "lifestyle product photography, realistic everyday setting matching product use case, " +
      "natural light, authentic environment, warm inviting mood",
  },
  {
    id: "seasonal",
    label: "Seasonal / Promotional",
    description: "Bold sale/holiday styling with promotional color palette and energetic layout.",
    accent: "#C43B3B",
    textColor: "#FFFFFF",
    promptFragment:
      "seasonal promotional advertisement, bold sale styling, vibrant festive color palette, " +
      "dynamic composition, high energy",
  },
  {
    id: "ugc",
    label: "UGC-Style",
    description: "Looks like an authentic user/creator photo or video, not a polished studio shot.",
    accent: "#DDE8DC",
    textColor: "#1D2B1E",
    promptFragment:
      "user-generated-content style photo, handheld authentic feel, natural imperfect framing, " +
      "casual real-life setting, unpolished but genuine",
  },
  {
    id: "bold-sale",
    label: "Bold Sale / Discount Banner",
    description: "High-contrast banner treatment built for grabbing attention fast with a strong CTA.",
    accent: "#101820",
    textColor: "#FFD23F",
    promptFragment:
      "high-contrast bold discount banner ad, large legible sale callout, strong call to action, " +
      "punchy color contrast, thumb-stopping composition",
  },
];

export function getStyle(id) {
  return STYLES.find((s) => s.id === id) || STYLES[0];
}
