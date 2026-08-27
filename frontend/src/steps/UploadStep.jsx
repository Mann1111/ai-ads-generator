import { useCallback, useRef, useState } from "react";
import { uploadImage } from "../lib/api";

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
      <h2 className="text-xl font-semibold mb-1">Upload your product photo</h2>
      <p className="text-gray-500 mb-5">
        Works with or without a model/character already in the shot — you'll choose how to handle that next.
      </p>

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
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-brand-500 bg-brand-50" : "border-gray-300 bg-white hover:border-brand-400"
        }`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="mx-auto max-h-64 rounded-lg object-contain" />
        ) : (
          <div className="text-gray-400">
            <p className="text-lg font-medium text-gray-600">Drag & drop your product image here</p>
            <p className="text-sm mt-1">or click to browse · JPG, PNG, WEBP · up to 15MB</p>
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

      {loading && <p className="mt-3 text-sm text-brand-600">Uploading…</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
