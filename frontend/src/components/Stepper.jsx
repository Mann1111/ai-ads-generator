const STEP_LABELS = ["Upload", "Mode & Style", "Formats", "Generate", "Review & Export"];

export default function Stepper({ current }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 mb-8 text-sm">
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const active = idx === current;
        const done = idx < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-medium transition-colors ${
                active
                  ? "bg-brand-600 text-white"
                  : done
                  ? "bg-brand-100 text-brand-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  active ? "bg-white/20" : done ? "bg-brand-500 text-white" : "bg-gray-300 text-white"
                }`}
              >
                {done ? "✓" : idx}
              </span>
              {label}
            </span>
            {idx < STEP_LABELS.length && <span className="text-gray-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
