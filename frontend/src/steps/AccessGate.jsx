import { useEffect, useRef, useState } from "react";
import { redeemCode, getPaymentsConfig, createPayment, getPaymentStatus, storeAccessCode } from "../lib/api";
import { Spinner, Badge } from "../components/ui";

export default function AccessGate({ onUnlocked }) {
  const [abaConfig, setAbaConfig] = useState(null); // null = still loading
  const [tab, setTab] = useState("pay"); // "pay" | "code"

  useEffect(() => {
    getPaymentsConfig()
      .then((cfg) => {
        setAbaConfig(cfg);
        setTab(cfg.enabled ? "pay" : "code");
      })
      .catch(() => setAbaConfig({ enabled: false }));
  }, []);

  const showTabs = abaConfig?.enabled;

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-soft sm:mt-16 sm:p-8 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-white/5">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-extrabold text-white shadow-soft">
        A
      </div>
      <h2 className="text-center text-lg font-bold dark:text-gray-50">Get access</h2>
      <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
        {showTabs
          ? "Pay instantly with ABA PayWay, or enter a code from a previous order."
          : "You'll find this in your order confirmation after purchasing on sleukchak.site."}
      </p>

      {showTabs && (
        <div className="mt-5 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <TabButton active={tab === "pay"} onClick={() => setTab("pay")}>
            Pay with ABA PayWay
          </TabButton>
          <TabButton active={tab === "code"} onClick={() => setTab("code")}>
            Enter code
          </TabButton>
        </div>
      )}

      <div className="mt-6">
        {tab === "pay" && showTabs && (
          <AbaPayPanel config={abaConfig} onUnlocked={onUnlocked} />
        )}
        {tab === "code" && <CodePanel onUnlocked={onUnlocked} />}
      </div>

      {tab === "code" && (
        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          Don't have a code yet?{" "}
          <a href="https://sleukchak.site" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
            Get one on sleukchak.site
          </a>
        </p>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
        active
          ? "bg-white text-gray-900 shadow-soft dark:bg-gray-900 dark:text-gray-50"
          : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

// --- Manual code entry (existing flow, unchanged behavior) -----------------

function CodePanel({ onUnlocked }) {
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
    <form onSubmit={submit} className="space-y-3">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="ADS-XXXXX-XXXXXXXX"
        autoFocus
        className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-center text-sm tracking-wide transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
      />
      {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-softLg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {loading && <Spinner className="h-4 w-4 text-white" />}
        {loading ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}

// --- ABA PayWay: create a QR session, poll until paid ----------------------

const POLL_MS = 3000;

function AbaPayPanel({ config, onUnlocked }) {
  const [payment, setPayment] = useState(null); // { paymentId, qrImage, expiresAt, mock }
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | pending | paid | expired | failed | error
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const start = async () => {
    setStarting(true);
    setError("");
    setStatus("idle");
    try {
      const p = await createPayment();
      setPayment(p);
      setStatus("pending");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (status !== "pending" || !payment) return;

    const poll = async () => {
      try {
        const result = await getPaymentStatus(payment.paymentId);
        if (result.status === "paid") {
          storeAccessCode(result.accessCode);
          setStatus("paid");
          onUnlocked();
        } else if (result.status === "expired" || result.status === "failed") {
          setStatus(result.status);
        }
        // "pending" (with or without a transient warning) — keep polling.
      } catch (e) {
        setError(e.message);
        setStatus("error");
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, payment?.paymentId]);

  if (!payment) {
    return (
      <div className="text-center">
        <p className="mb-4 text-2xl font-extrabold text-gray-900 dark:text-gray-50">
          ${config.amount}
          <span className="text-sm font-medium text-gray-400 dark:text-gray-500"> {config.currency}</span>
        </p>
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          onClick={start}
          disabled={starting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-softLg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {starting && <Spinner className="h-4 w-4 text-white" />}
          {starting ? "Preparing QR…" : "Pay with ABA PayWay"}
        </button>
        {config.mock && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">Test mode — no real payment is made.</p>
        )}
      </div>
    );
  }

  const secondsLeft = Math.max(0, Math.round((payment.expiresAt - now) / 1000));
  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="text-center">
      {status === "pending" && (
        <>
          <div className="mx-auto mb-3 w-fit rounded-xl border border-gray-100 bg-white p-2 dark:border-gray-800">
            <img src={payment.qrImage} alt="ABA PayWay KHQR code" className="h-40 w-40" />
          </div>
          <div className="mb-1 flex items-center justify-center gap-2">
            <Spinner className="h-3.5 w-3.5 text-brand-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Waiting for payment…</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Scan with your ABA Mobile app · expires in {mins}:{secs}
          </p>
          {payment.mock && (
            <p className="mt-2">
              <Badge tone="brand">Test mode — auto-approves in ~8s</Badge>
            </p>
          )}
        </>
      )}

      {status === "expired" && (
        <>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">This QR code expired before payment was completed.</p>
          <RetryButton onClick={() => setPayment(null)} />
        </>
      )}

      {status === "failed" && (
        <>
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">The payment wasn't completed. Nothing was charged.</p>
          <RetryButton onClick={() => setPayment(null)} />
        </>
      )}

      {status === "error" && (
        <>
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          <RetryButton onClick={() => setPayment(null)} />
        </>
      )}
    </div>
  );
}

function RetryButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
    >
      Try again
    </button>
  );
}
