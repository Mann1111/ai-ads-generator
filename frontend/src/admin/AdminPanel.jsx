import { useEffect, useState } from "react";
import {
  adminLogin,
  getAdminSettings,
  saveBranding,
  clearBrandLogo,
  savePaymentLogo,
  clearPaymentLogo,
} from "../lib/api";
import { Spinner, Badge } from "../components/ui";

const SECRET_KEY = "aiAdsGenerator.adminSecret";

// A small, self-contained settings page at /admin — no router library is
// used elsewhere in this app, so main.jsx just checks the URL path and
// renders this instead of the buyer-facing wizard. Auth is a single shared
// secret (ADMIN_SECRET on the server) typed in once and kept in
// sessionStorage for the rest of the browser tab, sent as the
// x-admin-secret header on every admin request.
export default function AdminPanel() {
  const [secret, setSecret] = useState(() => {
    try {
      return sessionStorage.getItem(SECRET_KEY) || "";
    } catch {
      return "";
    }
  });
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [settings, setSettings] = useState(null);

  const tryLogin = async (value) => {
    setChecking(true);
    setLoginError("");
    try {
      await adminLogin(value);
      try {
        sessionStorage.setItem(SECRET_KEY, value);
      } catch {
        // sessionStorage unavailable — login still works for this render
      }
      setAuthed(true);
      const s = await getAdminSettings(value);
      setSettings(s);
    } catch (e) {
      setAuthed(false);
      setLoginError(e.message);
    } finally {
      setChecking(false);
    }
  };

  // If a secret was already remembered for this tab, verify it silently on load.
  useEffect(() => {
    if (secret) tryLogin(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    const s = await getAdminSettings(secret);
    setSettings(s);
  };

  if (!authed) {
    return (
      <div className="mx-auto mt-16 max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-white/5">
        <h1 className="text-center text-lg font-bold text-gray-900 dark:text-gray-50">Admin panel</h1>
        <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          Enter the admin secret (ADMIN_SECRET on the server) to manage branding and payment-method logos.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (secret.trim()) tryLogin(secret.trim());
          }}
          className="mt-5 space-y-3"
        >
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin secret"
            autoFocus
            className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
          {loginError && <p className="text-center text-sm text-red-600 dark:text-red-400">{loginError}</p>}
          <button
            type="submit"
            disabled={checking}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-softLg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {checking && <Spinner className="h-4 w-4 text-white" />}
            {checking ? "Checking…" : "Log in"}
          </button>
        </form>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mt-16 flex justify-center">
        <Spinner className="h-6 w-6 text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-2xl px-4 pb-16">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Admin panel</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage the brand name/logo and payment-method logos shown on the ABA PayWay receipt.
      </p>

      <BrandSection secret={secret} settings={settings} onChange={refresh} />
      <PaymentLogosSection secret={secret} settings={settings} onChange={refresh} />
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-white/5">
      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-50">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BrandSection({ secret, settings, onChange }) {
  const [name, setName] = useState(settings.brandName || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await saveBranding(secret, { name, logoFile: file });
      setFile(null);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    setSaving(true);
    setError("");
    try {
      await clearBrandLogo(secret);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Brand" subtitle="Shown in the payment receipt header, in place of a hardcoded name.">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-lg font-extrabold text-white">
          {settings.brandLogoUrl ? (
            <img src={settings.brandLogoUrl} alt="Brand logo" className="h-full w-full object-contain bg-white" />
          ) : (
            (name || "A").trim().charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Brand name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sleuk Chak"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              Brand logo — recommended: {settings.recommendedSizes?.brandLogo}
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 dark:text-gray-300"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {saving ? "Saving…" : "Save brand"}
            </button>
            {settings.brandLogoUrl && (
              <button
                onClick={removeLogo}
                disabled={saving}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-500/40 dark:hover:text-red-400"
              >
                Remove logo
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PaymentLogosSection({ secret, settings, onChange }) {
  return (
    <Card
      title="Payment method logos"
      subtitle={`Recommended: ${settings.recommendedSizes?.paymentMethodLogo} — a method without a logo falls back to a plain text badge.`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {settings.paymentMethods.map((method) => (
          <PaymentLogoRow key={method} secret={secret} method={method} logoUrl={settings.paymentLogos[method]} onChange={onChange} />
        ))}
      </div>
    </Card>
  );
}

function PaymentLogoRow({ secret, method, logoUrl, onChange }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file) => {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      await savePaymentLogo(secret, method, file);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError("");
    try {
      await clearPaymentLogo(secret, method);
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
          {logoUrl ? (
            <img src={logoUrl} alt={`${method} logo`} className="h-8 max-w-[3.5rem] object-contain" />
          ) : (
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">No logo</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{method}</p>
          {saving ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Saving…</p>
          ) : error ? (
            <p className="truncate text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : logoUrl ? (
            <Badge tone="brand">Logo set</Badge>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">Text badge</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <label className="flex-1 cursor-pointer rounded-lg border border-gray-200 px-2.5 py-1.5 text-center text-xs font-semibold text-gray-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-300">
          Upload
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
        {logoUrl && (
          <button
            onClick={remove}
            className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-500/40 dark:hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
