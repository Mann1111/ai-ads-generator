import { useEffect, useMemo, useState } from "react";
import Stepper from "./components/Stepper";
import UploadStep from "./steps/UploadStep";
import ModeStyleStep from "./steps/ModeStyleStep";
import FormatStep from "./steps/FormatStep";
import GenerateStep from "./steps/GenerateStep";
import ReviewStep from "./steps/ReviewStep";
import AccessGate from "./steps/AccessGate";
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./lib/theme";
import { getMeta, generateAds, getJob, getAccessStatus, getStoredAccessCode } from "./lib/api";

const INITIAL_STATE = {
  step: 1,
  uploaded: null,
  category: "",
  mode: "product-only",
  addModel: false,
  style: null,
  outputTypes: ["image"],
  selectedFormats: ["square-1x1"],
  results: [],
  generating: false,
  genError: "",
};

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [meta, setMeta] = useState({ styles: [], formats: [], angles: [] });
  const [metaError, setMetaError] = useState("");
  const [state, setState] = useState(INITIAL_STATE);
  const [jobs, setJobs] = useState({});

  // null = still checking; true = no code needed / already unlocked; false = show the gate
  const [unlocked, setUnlocked] = useState(null);

  useEffect(() => {
    getAccessStatus()
      .then(({ gateEnabled }) => {
        setUnlocked(!gateEnabled || Boolean(getStoredAccessCode()));
      })
      .catch(() => setUnlocked(true)); // fail open rather than blocking the whole app on a status-check hiccup
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    getMeta()
      .then((m) => {
        setMeta(m);
        setState((s) => ({ ...s, style: s.style || m.styles[0]?.id }));
      })
      .catch((e) => setMetaError(e.message));
  }, [unlocked]);

  // Poll any in-flight video jobs every 1.5s until they finish.
  useEffect(() => {
    const pendingIds = state.results
      .flatMap((r) => r.videos || [])
      .map((v) => v.videoJobId)
      .filter((id) => id && jobs[id]?.status !== "done" && jobs[id]?.status !== "failed");

    if (pendingIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const id of pendingIds) {
        try {
          const job = await getJob(id);
          setJobs((prev) => ({ ...prev, [id]: job }));
        } catch {
          // job lookup failing transiently is fine; next tick retries
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [state.results, jobs]);

  const formatsById = useMemo(() => Object.fromEntries(meta.formats.map((f) => [f.id, f])), [meta.formats]);
  const stylesById = useMemo(() => Object.fromEntries(meta.styles.map((s) => [s.id, s])), [meta.styles]);

  const goTo = (step) => setState((s) => ({ ...s, step }));
  const patch = (fields) => setState((s) => ({ ...s, ...fields }));

  const canProceedFromStep = {
    1: !!state.uploaded,
    2: !!state.style,
    3: state.outputTypes.length > 0 && state.selectedFormats.length > 0,
  };

  const summary = {
    category: state.category,
    modeLabel:
      state.mode === "with-model"
        ? "Model already in photo"
        : state.addModel
        ? "Product only + add AI model"
        : "Product only",
    styleLabel: stylesById[state.style]?.label || "—",
    outputTypesLabel: state.outputTypes.map((t) => (t === "image" ? "Static image" : "Video")).join(" + "),
    formatsLabel: state.selectedFormats.map((id) => formatsById[id]?.label).join(", "),
    includesVideo: state.outputTypes.includes("video"),
    videoCount: state.outputTypes.includes("video") ? state.selectedFormats.length * 5 : 0,
  };

  const handleGenerate = async () => {
    patch({ generating: true, genError: "" });
    try {
      const { results } = await generateAds({
        imageId: state.uploaded.imageId,
        category: state.category,
        mode: state.mode,
        addModel: state.addModel,
        style: state.style,
        outputTypes: state.outputTypes,
        formats: state.selectedFormats,
      });
      patch({ results, generating: false, step: 5 });
    } catch (e) {
      patch({ generating: false, genError: e.message });
    }
  };

  const startOver = () => {
    setState({ ...INITIAL_STATE, style: meta.styles[0]?.id });
    setJobs({});
  };

  if (unlocked === null) {
    return <Shell theme={theme} toggleTheme={toggleTheme} />; // brief flash while checking access status; avoids a gate flicker for already-unlocked users
  }

  if (!unlocked) {
    return (
      <Shell theme={theme} toggleTheme={toggleTheme}>
        <AccessGate onUnlocked={() => setUnlocked(true)} />
      </Shell>
    );
  }

  if (metaError) {
    return (
      <Shell theme={theme} toggleTheme={toggleTheme}>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          Couldn't reach the backend: {metaError}. Is it running on port 4000?
        </div>
      </Shell>
    );
  }

  return (
    <Shell theme={theme} toggleTheme={toggleTheme}>
      <Stepper current={state.step} />

      <div
        key={state.step}
        className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft sm:p-8 animate-fade-up dark:border-gray-800 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-white/5"
      >
        {state.step === 1 && <UploadStep onUploaded={(uploaded) => patch({ uploaded, step: 2 })} />}

        {state.step === 2 && state.uploaded && (
          <ModeStyleStep
            uploaded={state.uploaded}
            category={state.category}
            setCategory={(category) => patch({ category })}
            mode={state.mode}
            setMode={(mode) => patch({ mode })}
            addModel={state.addModel}
            setAddModel={(addModel) => patch({ addModel })}
            style={state.style}
            setStyle={(style) => patch({ style })}
            styles={meta.styles}
          />
        )}

        {state.step === 3 && (
          <FormatStep
            outputTypes={state.outputTypes}
            setOutputTypes={(fn) => patch({ outputTypes: typeof fn === "function" ? fn(state.outputTypes) : fn })}
            formats={meta.formats}
            selectedFormats={state.selectedFormats}
            setSelectedFormats={(fn) =>
              patch({ selectedFormats: typeof fn === "function" ? fn(state.selectedFormats) : fn })
            }
            angles={meta.angles}
          />
        )}

        {state.step === 4 && (
          <GenerateStep summary={summary} generating={state.generating} error={state.genError} onGenerate={handleGenerate} />
        )}

        {state.step === 5 && (
          <ReviewStep
            results={state.results}
            formatsById={formatsById}
            jobs={jobs}
            angles={meta.angles}
            onStartOver={startOver}
          />
        )}

        {state.step < 5 && (
          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6 dark:border-gray-800">
            <button
              onClick={() => goTo(Math.max(1, state.step - 1))}
              disabled={state.step === 1}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 disabled:opacity-0 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Back
            </button>
            {state.step < 4 && (
              <button
                onClick={() => goTo(state.step + 1)}
                disabled={!canProceedFromStep[state.step]}
                className="rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-softLg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Continue
              </button>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children, theme, toggleTheme }) {
  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 sm:px-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-base font-extrabold text-white shadow-soft">
            A
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight dark:text-gray-50 sm:text-lg">AI Ads Generator</h1>
            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
              Product photo → static &amp; Khmer video ads, in minutes
            </p>
          </div>
          {theme && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      <footer className="mx-auto mt-4 max-w-5xl px-4 text-center text-xs text-gray-400 dark:text-gray-500 sm:px-6">
        Built for sleukchak.site · every video's on-screen dialogue is written in Khmer
      </footer>
    </div>
  );
}
