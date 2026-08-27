import ResultCard from "../components/ResultCard";

export default function ReviewStep({ results, formatsById, jobs, onStartOver }) {
  const anyPending = results.some((r) => r.videoJobId && jobs[r.videoJobId]?.status !== "done" && jobs[r.videoJobId]?.status !== "failed");

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-semibold">Your generated ads</h2>
        <button onClick={onStartOver} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
          Start a new batch
        </button>
      </div>
      <p className="text-gray-500 mb-6">
        {anyPending ? "Video ads are still rendering — this page updates automatically." : "All assets are ready to download."}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((r, i) => {
          const job = r.videoJobId ? jobs[r.videoJobId] : null;
          return (
            <ResultCard
              key={i}
              formatLabel={formatsById[r.formatId]?.label || r.formatId}
              image={r.image}
              video={job?.status === "done" ? job.result : null}
              videoJobStatus={job?.status}
              videoJobProgress={job?.progress}
            />
          );
        })}
      </div>
    </div>
  );
}
