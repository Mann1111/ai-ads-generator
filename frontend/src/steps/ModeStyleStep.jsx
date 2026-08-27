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
      <h2 className="text-xl font-semibold mb-1">Tell us about the shot & pick a style</h2>
      <p className="text-gray-500 mb-6">This shapes how the AI composes your ad.</p>

      <div className="grid md:grid-cols-[220px_1fr] gap-8">
        <img
          src={uploaded.publicPath}
          alt="Uploaded product"
          className="w-full h-auto rounded-lg border border-gray-200 object-contain bg-white"
        />

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Product category</label>
            <input
              list="category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Beauty / Skincare"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option value={c} key={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Does this photo already include a model or character?</label>
            <div className="flex gap-3">
              <ModeButton
                active={mode === "product-only"}
                onClick={() => setMode("product-only")}
                title="Product only"
                subtitle="Just the product, no person"
              />
              <ModeButton
                active={mode === "with-model"}
                onClick={() => setMode("with-model")}
                title="Model / character included"
                subtitle="A person is already in the shot"
              />
            </div>

            {mode === "product-only" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={addModel}
                  onChange={(e) => setAddModel(e.target.checked)}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Add an AI-generated model to this ad
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ad style</label>
            <div className="grid sm:grid-cols-2 gap-3">
              {styles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    style === s.id ? "border-brand-500 ring-2 ring-brand-200" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="h-10 w-full rounded mb-2"
                    style={{ background: s.accent, border: "1px solid rgba(0,0,0,0.08)" }}
                  />
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg border p-3 text-left transition-all ${
        active ? "border-brand-500 ring-2 ring-brand-200 bg-brand-50" : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </button>
  );
}
