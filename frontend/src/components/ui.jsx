// Small shared UI primitives used across the wizard steps, kept in one place
// so spacing/typography stays consistent instead of drifting per-step.

export function StepHeading({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold sm:text-xl dark:text-gray-50">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  );
}

export function Spinner({ className = "h-4 w-4 text-brand-500" }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  );
}

export function Badge({ children, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    pink: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SelectableCard({ active, onClick, className = "", children }) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-xl border p-3.5 transition-all ${
        active
          ? "border-brand-400 ring-2 ring-brand-200 bg-brand-50/60 shadow-soft dark:border-brand-400 dark:bg-brand-500/10 dark:ring-brand-500/30 dark:shadow-none"
          : "border-gray-200 bg-white hover:border-brand-200 hover:bg-brand-50/20 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
      } ${className}`}
    >
      {active && (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gradient text-[11px] text-white">
          ✓
        </span>
      )}
      {children}
    </button>
  );
}
