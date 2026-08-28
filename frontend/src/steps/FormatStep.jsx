import { StepHeading, SelectableCard, Badge } from "../components/ui";

export default function FormatStep({ outputTypes, setOutputTypes, formats, selectedFormats, setSelectedFormats, angles = [] }) {
  const toggleOutputType = (type) => {
    setOutputTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };
  const toggleFormat = (id) => {
    setSelectedFormats((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };
  const includesVideo = outputTypes.includes("video");

  return (
    <div>
      <StepHeading
        title="Choose output types & ad formats"
        subtitle="Select multiple formats to batch-generate a full set in one pass."
      />

      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">Output type</label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <SelectableCard active={outputTypes.includes("image")} onClick={() => toggleOutputType("image")}>
            <div className="text-sm font-semibold">Static image ads</div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Ready-to-post ad creatives</div>
          </SelectableCard>
          <SelectableCard active={outputTypes.includes("video")} onClick={() => toggleOutputType("video")}>
            <div className="text-sm font-semibold">Short video ads</div>
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">5 Khmer-dialogue angles per format · ~6s each</div>
          </SelectableCard>
        </div>
      </div>

      {includesVideo && angles.length > 0 && (
        <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Every format generates all 5 angles below, each with its own Khmer dialogue
          </p>
          <div className="flex flex-wrap gap-1.5">
            {angles.map((a) => (
              <Badge key={a.id} tone="brand">
                {a.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">Formats (select one or more)</label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {formats.map((f) => (
            <SelectableCard key={f.id} active={selectedFormats.includes(f.id)} onClick={() => toggleFormat(f.id)}>
              <div className="flex items-center gap-3">
                <AspectIcon width={f.width} height={f.height} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {f.label}
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                      {f.width}×{f.height}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{f.platforms.join(" · ")}</div>
                </div>
              </div>
            </SelectableCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// A tiny outline shaped to the format's real aspect ratio — makes it
// obvious at a glance whether a card is square/portrait/landscape instead
// of relying on reading the pixel dimensions.
function AspectIcon({ width, height }) {
  const boxH = 30;
  const boxW = Math.round(boxH * (width / height));
  const maxW = 34;
  const scale = boxW > maxW ? maxW / boxW : 1;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800">
      <div
        className="rounded-[3px] border-[1.5px] border-brand-400 bg-brand-100 dark:bg-brand-500/20"
        style={{ width: Math.round(boxW * scale), height: Math.round(boxH * scale) }}
      />
    </div>
  );
}
