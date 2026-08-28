import ResultCard from "../components/ResultCard";
import VideoAngleCard from "../components/VideoAngleCard";
import { StepHeading } from "../components/ui";

export default function ReviewStep({ results, formatsById, jobs, angles = [], onStartOver }) {
  const anglesById = Object.fromEntries(angles.map((a) => [a.id, a]));

  const anyPending = results
    .flatMap((r) => r.videos || [])
    .some((v) => jobs[v.videoJobId]?.status !== "done" && jobs[v.videoJobId]?.status !== "failed");

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <StepHeading
          title="Your generated ads"
          subtitle={anyPending ? "Videos are still rendering — this page updates automatically." : "All assets are ready to download."}
        />
        <button onClick={onStartOver} className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
          Start a new batch
        </button>
      </div>

      <div className="space-y-10">
        {results.map((r, i) => {
          const format = formatsById[r.formatId];
          const dims = format ? `${format.width}×${format.height}` : "";
          return (
            <section key={i}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                {format?.label || r.formatId}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {dims}
                </span>
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {r.image && <ResultCard formatLabel={format?.label} dims={dims} image={r.image} />}

                {(r.videos || []).map((v) => {
                  const job = jobs[v.videoJobId];
                  const angle = anglesById[v.angleId];
                  return (
                    <VideoAngleCard
                      key={v.videoJobId}
                      angleLabel={v.angleLabel}
                      dialogue={angle ? { hook: angle.hook, body: angle.body, cta: angle.cta } : job?.result?.dialogue}
                      video={job?.status === "done" ? job.result : null}
                      jobStatus={job?.status}
                      jobProgress={job?.progress}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
