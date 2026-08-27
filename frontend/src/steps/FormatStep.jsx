export default function FormatStep({ outputTypes, setOutputTypes, formats, selectedFormats, setSelectedFormats }) {
  const toggleOutputType = (type) => {
    setOutputTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };
  const toggleFormat = (id) => {
    setSelectedFormats((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Choose output types & ad formats</h2>
      <p className="text-gray-500 mb-6">Select multiple formats to batch-generate a full set in one pass.</p>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Output type</label>
        <div className="flex gap-3">
          <OutputToggle
            active={outputTypes.includes("image")}
            onClick={() => toggleOutputType("image")}
            title="Static image ads"
            subtitle="Ready-to-post ad creatives"
          />
          <OutputToggle
            active={outputTypes.includes("video")}
            onClick={() => toggleOutputType("video")}
            title="Short video ads"
            subtitle="~5s motion ad with CTA"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Formats (select one or more)</label>
        <div className="grid sm:grid-cols-2 gap-3">
          {formats.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFormat(f.id)}
              className={`text-left rounded-lg border p-3 transition-all ${
                selectedFormats.includes(f.id)
                  ? "border-brand-500 ring-2 ring-brand-200 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{f.label}</span>
                <span className="text-xs text-gray-400">
                  {f.width}×{f.height}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{f.platforms.join(" · ")}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OutputToggle({ active, onClick, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg border p-3 text-left transition-all ${
        active ? "border-brand-500 ring-2 ring-brand-200 bg-brand-50" : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </button>
  );
}
