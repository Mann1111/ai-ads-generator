import { StepHeading, SelectableCard } from "../components/ui";

const CATEGORY_SUGGESTIONS = [
  "Apparel / Fashion",
  "Beauty / Skincare",
  "Jewelry / Accessories",
  "Electronics / Gadgets",
  "Home / Furniture",
  "Food / Beverage",
  "Supplements / Health",
  "Footwear",
  "Toys / Kids",
  "General e-commerce",
];

export default function ModeStyleStep({
  uploaded,
  category,
  setCategory,
  mode,
  setMode,
  addModel,
  setAddModel,
  style,
  setStyle,
  styles,
}) {
  return (
    <div>
      <StepHeading title="Tell us about the shot & pick a style" subtitle="This shapes how the AI composes your ad." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-8">
        <div className="mx-auto w-40 sm:w-full md:mx-0">
          <img
            src={uploaded.publicPath}
            alt="Uploaded product"
            className="h-auto w-full rounded-xl border border-gray-100 bg-white object-contain shadow-soft dark:border-gray-800 dark:bg-gray-950"
          />
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Product category</label>
            <input
              list="category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Beauty / Skincare"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-brand-500/20"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option value={c} key={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Does this photo already include a model or character?
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <SelectableCard active={mode === "product-only"} onClick={() => setMode("product-only")}>
                <div className="text-sm font-semibold">Product only</div>
                <div className="mt-0.5 text-xs text-gray-500">Just the product, no person</div>
              </SelectableCard>
              <SelectableCard active={mode === "with-model"} onClick={() => setMode("with-model")}>
                <div className="text-sm font-semibold">Model / character included</div>
                <div className="mt-0.5 text-xs text-gray-500">A person is already in the shot</div>
              </SelectableCard>
            </div>

            {mode === "product-only" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={addModel}
                  onChange={(e) => setAddModel(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
                />
                Add an AI-generated model to this ad
              </label>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Ad style</label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {styles.map((s) => (
                <SelectableCard key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
                  <div
                    className="mb-2 h-9 w-full rounded-lg"
                    style={{ background: s.accent, border: "1px solid rgba(0,0,0,0.08)" }}
                  />
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{s.description}</div>
                </SelectableCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
