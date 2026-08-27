import { useEffect, useMemo, useState } from "react";
import Stepper from "./components/Stepper";
import UploadStep from "./steps/UploadStep";
import ModeStyleStep from "./steps/ModeStyleStep";
import FormatStep from "./steps/FormatStep";
import GenerateStep from "./steps/GenerateStep";
import ReviewStep from "./steps/ReviewStep";
import AccessGate from "./steps/AccessGate";
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
  const [meta, setMeta] = useState({ styles: [], formats: [] });
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
      .map((r) => r.videoJobId)
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
    return <Shell />; // brief flash while checking access status; avoids a gate flicker for already-unlocked users
  }

  if (!unlocked) {
    return (
      <Shell>
        <AccessGate onUnlocked={() => setUnlocked(true)} />
      </Shell>
    );
  }

  if (metaError) {
    return (
      <Shell>
        <p className="text-red-600">Couldn't reach the backend: {metaError}. Is it running on port 4000?</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Stepper current={state.step} />

      {state.step === 1 && (
        <UploadStep onUploaded={(uploaded) => patch({ uploaded, step: 2 })} />
      )}

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
        />
      )}

      {state.step === 4 && (
        <GenerateStep summary={summary} generating={state.generating} error={state.genError} onGenerate={handleGenerate} />
      )}

      {state.step === 5 && (
        <ReviewStep results={state.results} formatsById={formatsById} jobs={jobs} onStartOver={startOver} />
      )}

      {state.step < 5 && (
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => goTo(Math.max(1, state.step - 1))}
            disabled={state.step === 1}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-0"
          >
            Back
          </button>
          {state.step < 4 && (
            <button
              onClick={() => goTo(state.step + 1)}
              disabled={!canProceedFromStep[state.step]}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-lg font-semibold">AI Ads Generator</h1>
          <p className="text-xs text-gray-500">Upload a product photo → auto-generate static & video ads</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
