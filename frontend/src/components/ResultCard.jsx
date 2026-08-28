// Static image ad result — one per format.
export default function ResultCard({ formatLabel, dims, image }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <div className="flex items-center justify-between border-b border-gray-100 px-3.5 py-2.5 dark:border-gray-800">
        <span className="text-sm font-semibold dark:text-gray-100">Static image ad</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{dims}</span>
      </div>
      <div className="p-3.5">
        {image ? (
          <>
            <img
              src={image.publicPath}
              alt={`${formatLabel} ad`}
              className="w-full rounded-lg border border-gray-100 dark:border-gray-800"
            />
            <a
              href={image.publicPath}
              download
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <DownloadIcon /> Download image
            </a>
          </>
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-gray-400 dark:text-gray-500">Not generated</div>
        )}
      </div>
    </div>
  );
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14" />
    </svg>
  );
}
