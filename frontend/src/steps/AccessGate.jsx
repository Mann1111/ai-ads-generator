import { useState } from "react";
import { redeemCode } from "../lib/api";

export default function AccessGate({ onUnlocked }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      await redeemCode(code.trim());
      onUnlocked();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h2 className="text-xl font-semibold mb-1 text-center">Enter your access code</h2>
      <p className="text-gray-500 text-sm mb-6 text-center">
        You'll find this in your order confirmation after purchasing on sleukchak.site.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ADS-XXXXX-XXXXXXXX"
          autoFocus
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-center tracking-wide focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-6">
        Don't have a code yet?{" "}
        <a href="https://sleukchak.site" className="text-brand-600 hover:text-brand-700">
          Get one on sleukchak.site
        </a>
      </p>
    </div>
  );
}
