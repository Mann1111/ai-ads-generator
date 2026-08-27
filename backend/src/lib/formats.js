// Output format presets (aspect ratio + pixel dimensions) mapped to the
// platforms/placements they're commonly used for.

export const FORMATS = [
  {
    id: "square-1x1",
    label: "Feed 1:1",
    platforms: ["Instagram Feed", "Facebook Feed"],
    width: 1080,
    height: 1080,
  },
  {
    id: "portrait-9x16",
    label: "Stories/Reels 9:16",
    platforms: ["Instagram Stories/Reels", "TikTok", "YouTube Shorts"],
    width: 1080,
    height: 1920,
  },
  {
    id: "landscape-16x9",
    label: "Display/Video 16:9",
    platforms: ["Google Display", "YouTube", "Meta Video Feed"],
    width: 1920,
    height: 1080,
  },
  {
    id: "portrait-4x5",
    label: "Feed 4:5",
    platforms: ["Instagram Feed (tall)", "Facebook Feed (tall)"],
    width: 1080,
    height: 1350,
  },
];

export function getFormat(id) {
  return FORMATS.find((f) => f.id === id) || FORMATS[0];
}
