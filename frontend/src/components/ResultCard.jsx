export default function ResultCard({ formatLabel, image, video, videoJobStatus, videoJobProgress, onRegenerate }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-medium">{formatLabel}</span>
        {onRegenerate && (
          <button onClick={onRegenerate} className="text-xs text-brand-600 hover:text-brand-700">
            Regenerate
          </button>
        )}
      </div>

      <div className="p-3 space-y-3">
        {image && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Static image ad</p>
            <img src={image.publicPath} alt={`${formatLabel} ad`} className="w-full rounded-md border border-gray-100" />
            <a
              href={image.publicPath}
              download
              className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Download image ↓
            </a>
          </div>
        )}

        {video && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Video ad</p>
            <video src={video.publicPath} controls loop className="w-full rounded-md border border-gray-100" />
            <a
              href={video.publicPath}
              download
              className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Download video ↓
            </a>
          </div>
        )}

        {!video && videoJobStatus && videoJobStatus !== "done" && videoJobStatus !== "failed" && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Video ad — generating…</p>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${videoJobProgress || 5}%` }}
              />
            </div>
          </div>
        )}

        {videoJobStatus === "failed" && <p className="text-xs text-red-600">Video generation failed.</p>}
      </div>
    </div>
  );
}
