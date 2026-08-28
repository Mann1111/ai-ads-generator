import { useCallback, useRef, useState } from "react";
import { uploadImage } from "../lib/api";
import { StepHeading, Spinner } from "../components/ui";

export default function UploadStep({ onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const result = await uploadImage(file);
      onUploaded(result);
    } catch (e) {
      setError(e.message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [onUploaded]);

  return (
    <div>
      <StepHeading
        title="Upload your product photo"
        subtitle="Works with or without a model/character already in the shot — you'll choose how to handle that next."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`group cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all sm:p-14 ${
          dragOver
            ? "border-brand-500 bg-brand-50 scale-[1.01] dark:bg-brand-500/10"
            : "border-gray-200 bg-gray-50/60 hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/5"
        }`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="mx-auto max-h-64 rounded-xl object-contain shadow-soft" />
        ) : (
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft transition-transform group-hover:-translate-y-0.5">
              <UploadIcon />
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200 sm:text-lg">
              Drag &amp; drop your product image
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">or tap to browse · JPG, PNG, WEBP · up to 15MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {loading && (
        <p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-brand-600">
          <Spinner /> Uploading…
        </p>
      )}
      {error && <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
