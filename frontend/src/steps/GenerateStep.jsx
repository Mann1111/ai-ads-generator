import { StepHeading, Spinner } from "../components/ui";

export default function GenerateStep({ summary, generating, error, onGenerate }) {
  return (
    <div>
      <StepHeading title="Ready to generate" subtitle="Review your selections, then generate the full batch." />

      <dl className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm sm:grid-cols-2 sm:p-5 dark:border-gray-800 dark:bg-gray-800/40">
        <SummaryRow label="Category" value={summary.category || "Not specified"} />
        <SummaryRow label="Mode" value={summary.modeLabel} />
        <SummaryRow label="Style" value={summary.styleLabel} />
        <SummaryRow label="Output types" value={summary.outputTypesLabel} />
        <SummaryRow label="Formats" value={summary.formatsLabel} className="sm:col-span-2" />
      </dl>

      {summary.includesVideo && (
        <p className="mb-6 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-brand-800 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-brand-300">
          This batch will render <strong>{summary.videoCount} videos</strong> (5 Khmer-dialogue angles ×{" "}
          {summary.videoCount / 5} format{summary.videoCount / 5 === 1 ? "" : "s"}). Videos render in the background —
          you'll see them fill in on the review screen.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={onGenerate}
        disabled={generating}
        className="flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-softLg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {generating && <Spinner className="h-4 w-4 text-white" />}
        {generating ? "Generating…" : "Generate ads"}
      </button>
    </div>
  );
}

function SummaryRow({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}
