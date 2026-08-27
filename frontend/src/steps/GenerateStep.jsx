export default function GenerateStep({ summary, generating, error, onGenerate }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Ready to generate</h2>
      <p className="text-gray-500 mb-6">Review your selections, then generate the full batch.</p>

      <dl className="grid sm:grid-cols-2 gap-4 bg-white rounded-lg border border-gray-200 p-4 mb-6 text-sm">
        <SummaryRow label="Category" value={summary.category || "Not specified"} />
        <SummaryRow label="Mode" value={summary.modeLabel} />
        <SummaryRow label="Style" value={summary.styleLabel} />
        <SummaryRow label="Output types" value={summary.outputTypesLabel} />
        <SummaryRow label="Formats" value={summary.formatsLabel} className="sm:col-span-2" />
      </dl>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={onGenerate}
        disabled={generating}
        className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {generating ? "Generating…" : "Generate ads"}
      </button>
    </div>
  );
}

function SummaryRow({ label, value, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
