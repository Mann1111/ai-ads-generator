import { Badge } from "./ui";
import { DownloadIcon } from "./ResultCard";

// One of the 5 marketing-angle video variants for a single format. Shows
// the Khmer dialogue lines that were burned into the clip as captions, so
// it's clear which script goes with which video before/while it renders.
export default function VideoAngleCard({ angleLabel, dialogue, video, jobStatus, jobProgress }) {
  const failed = jobStatus === "failed";
  // Treat "no status yet" the same as "queued" — the poller hasn't done its
  // first tick for a second or two right after a batch is kicked off, and
  // that gap should still show a loading state, not a blank card.
  const pending = !video && !failed;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-2.5 dark:border-gray-800">
        <Badge tone="brand">{angleLabel}</Badge>
        {video && (
          <a
            href={video.publicPath}
            download
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <DownloadIcon /> Download
          </a>
        )}
      </div>

      <div className="p-3.5">
        {video && (
          <video src={video.publicPath} controls loop playsInline className="w-full rounded-lg border border-gray-100 bg-black dark:border-gray-800" />
        )}

        {pending && (
          <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-brand-gradient transition-all"
                style={{ width: `${jobProgress || 5}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {jobStatus === "queued" ? "Queued…" : "Rendering…"}
            </p>
          </div>
        )}

        {failed && (
          <div className="flex h-40 items-center justify-center rounded-lg bg-red-50 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
            Video generation failed.
          </div>
        )}

        {dialogue && (
          <dl className="mt-3 space-y-1 khmer-text text-[13px] leading-snug text-gray-600 dark:text-gray-400">
            <div>
              <dt className="inline text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Hook{" "}
              </dt>
              <dd className="inline">{dialogue.hook}</dd>
            </div>
            <div>
              <dt className="inline text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                Body{" "}
              </dt>
              <dd className="inline">{dialogue.body}</dd>
            </div>
            <div>
              <dt className="inline text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                CTA{" "}
              </dt>
              <dd className="inline font-semibold text-gray-800 dark:text-gray-200">{dialogue.cta}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
