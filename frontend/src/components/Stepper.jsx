const STEP_LABELS = ["Upload", "Mode & Style", "Formats", "Generate", "Review & Export"];

export default function Stepper({ current }) {
  return (
    <div className="mb-6 sm:mb-8">
      {/* Compact "Step X of Y" + current label — always visible, clearest on mobile. */}
      <p className="mb-2 text-xs font-medium text-gray-400 sm:hidden">
        Step {current} of {STEP_LABELS.length} · <span className="text-brand-600">{STEP_LABELS[current - 1]}</span>
      </p>

      <ol className="flex items-center gap-1.5 sm:gap-2">
        {STEP_LABELS.map((label, i) => {
          const idx = i + 1;
          const active = idx === current;
          const done = idx < current;
          return (
            <li key={label} className="flex flex-1 items-center gap-1.5 sm:flex-initial sm:gap-2">
              <span
                className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3.5 sm:py-2 sm:text-sm ${
                  active
                    ? "bg-brand-gradient text-white shadow-soft"
                    : done
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    active
                      ? "bg-white/25"
                      : done
                      ? "bg-brand-500 text-white"
                      : "bg-gray-300 text-white dark:bg-gray-600"
                  }`}
                >
                  {done ? "✓" : idx}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
              {idx < STEP_LABELS.length && <span className="hidden h-px flex-1 bg-gray-200 dark:bg-gray-800 sm:block" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
