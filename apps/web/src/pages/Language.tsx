import { useState } from "react";

const LANGUAGES = [
  { code: "en", label: "English", ready: true },
  { code: "ar", label: "العربية", ready: false },
  { code: "fr", label: "Français", ready: false },
];

export function Language() {
  const [selected, setSelected] = useState(() => localStorage.getItem("cado-language") ?? "en");

  const select = (code: string, ready: boolean) => {
    if (!ready) return;
    setSelected(code);
    localStorage.setItem("cado-language", code);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Language</h1>

      <div className="mt-7 flex flex-col gap-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => select(lang.code, lang.ready)}
            disabled={!lang.ready}
            className={`flex items-center justify-between rounded-card px-4 py-3.5 text-left text-sm transition ${
              selected === lang.code ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/8"
            } ${!lang.ready ? "opacity-40" : ""}`}
          >
            <span className="font-medium">{lang.label}</span>
            {!lang.ready ? <span className="text-xs">Coming soon</span> : null}
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-ink/40">
        Arabic and French are on the way — the app runs in English for now.
      </p>
    </div>
  );
}
