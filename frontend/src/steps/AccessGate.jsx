import { useEffect, useRef, useState } from "react";
import { redeemCode, getPaymentsConfig, createPayment, getPaymentStatus, storeAccessCode } from "../lib/api";
import { Spinner, Badge } from "../components/ui";

export default function AccessGate({ onUnlocked }) {
  const [abaConfig, setAbaConfig] = useState(null); // null = still loading
  const [tab, setTab] = useState("pay"); // "pay" | "code"
  const [session, setSession] = useState(null); // set once a QR payment is created — switches to the full receipt view

  useEffect(() => {
    getPaymentsConfig()
      .then((cfg) => {
        setAbaConfig(cfg);
        setTab(cfg.enabled ? "pay" : "code");
      })
      .catch(() => setAbaConfig({ enabled: false }));
  }, []);

  const showTabs = abaConfig?.enabled;

  // Once a payment session exists, the QR takes over the whole card — a
  // dedicated "receipt" layout (brand header, product + amount, QR, and the
  // accepted-payment-methods footer) rather than living inside the plain
  // tabbed card below.
  if (session) {
    return <PaymentReceipt config={abaConfig} session={session} onUnlocked={onUnlocked} onExit={() => setSession(null)} />;
  }

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
        {tab === "pay" && showTabs && <AbaPayStart config={abaConfig} onStarted={setSession} />}
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

// --- ABA PayWay: the "start" button shown inside the plain card -----------

function AbaPayStart({ config, onStarted }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const p = await createPayment();
      onStarted(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

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
      {config.mock && <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">Test mode — no real payment is made.</p>}
    </div>
  );
}

// --- ABA PayWay receipt: brand header, product + amount, glowing QR frame,
// and a footer row of accepted payment methods — takes over the whole card
// once a QR session exists, polling until it's paid. ------------------------

const POLL_MS = 3000;
// Fallback list/order if the server response is ever missing paymentMethods
// (e.g. an older cached /api/payments/config) — normally config.paymentMethods
// (from the admin-managed settings) is used instead.
const DEFAULT_PAYMENT_METHODS = ["ABA", "ACLEDA", "Wing", "TrueMoney", "VISA", "Mastercard", "UnionPay"];

function PaymentReceipt({ config, session, onUnlocked, onExit }) {
  const [payment, setPayment] = useState(session);
  const [status, setStatus] = useState("pending"); // pending | paid | expired | failed | error
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    if (status !== "pending") return;

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
  }, [status, payment.paymentId]);

  const retry = async () => {
    setError("");
    setStatus("pending");
    try {
      const p = await createPayment();
      setPayment(p);
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  };

  const secondsLeft = Math.max(0, Math.round((payment.expiresAt - now) / 1000));
  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const brandName = config.brandName || "AI Ads Generator";
  const paymentMethods = config.paymentMethods?.length ? config.paymentMethods : DEFAULT_PAYMENT_METHODS;
  const paymentLogos = config.paymentLogos || {};

  return (
    <div className="mx-auto mt-10 max-w-sm overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft sm:mt-16 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-white/5">
      {/* Brand header — name/logo come from the admin-managed settings
          (/api/payments/config), falling back to a generic name + initial
          tile until an admin sets a real brand on the /admin page. */}
      <div className="relative flex items-center gap-3 bg-brand-gradient px-5 py-4 text-white">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-base font-extrabold ring-1 ring-white/25">
          {config.brandLogoUrl ? (
            <img src={config.brandLogoUrl} alt={`${brandName} logo`} className="h-full w-full object-contain bg-white" />
          ) : (
            brandName.trim().charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">{brandName}</p>
          <p className="text-[11px] leading-tight text-white/80">Secure Digital Payment</p>
        </div>
        <button
          onClick={onExit}
          aria-label="Close"
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="px-5 py-5 sm:px-7">
        {/* Product + amount */}
        <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">{config.productName}</p>
        <p className="mt-1 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-50">
          ${payment.amount}
          <span className="ml-1 text-sm font-semibold text-gray-400 dark:text-gray-500">{payment.currency}</span>
        </p>

        <div className="mt-5 flex flex-col items-center">
          {status === "pending" && (
            <>
              <div className="qr-glow-ring">
                <div className="rounded-[17px] bg-white p-3 dark:bg-gray-950">
                  <img src={payment.qrImage} alt="ABA PayWay KHQR code" className="h-40 w-40" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Waiting for payment confirmation</span>
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Scan this KHQR code using your ABA Mobile app or supported banking app · expires in {mins}:{secs}
              </p>
              {payment.mock && (
                <p className="mt-2">
                  <Badge tone="brand">Test mode — auto-approves in ~8s</Badge>
                </p>
              )}
            </>
          )}

          {status === "expired" && (
            <div className="w-full text-center">
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">This QR code expired before payment was completed.</p>
              <RetryButton onClick={retry} />
            </div>
          )}

          {status === "failed" && (
            <div className="w-full text-center">
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">The payment wasn't completed. Nothing was charged.</p>
              <RetryButton onClick={retry} />
            </div>
          )}

          {status === "error" && (
            <div className="w-full text-center">
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
              <RetryButton onClick={retry} />
            </div>
          )}
        </div>
      </div>

      {/* Accepted payment methods footer */}
      <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/40">
        <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Accepted payment methods
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {paymentMethods.map((name, i) => {
            const logoUrl = paymentLogos[name];
            return (
              <span
                key={name}
                className="pay-method-badge flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                style={{ "--shine-delay": `${i * 0.35}s` }}
              >
                {logoUrl ? <img src={logoUrl} alt={name} className="h-4 max-w-[3.25rem] object-contain" /> : name}
              </span>
            );
          })}
        </div>
      </div>
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
