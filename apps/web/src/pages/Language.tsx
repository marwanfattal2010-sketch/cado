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
      <h1 className="font-display text-h1">Language</h1>

      <div className="mt-7 flex flex-col gap-3">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => select(lang.code, lang.ready)}
            disabled={!lang.ready}
            aria-pressed={selected === lang.code}
            className={`flex min-h-[52px] items-center justify-between rounded-card px-4 py-3.5 text-left text-body transition ${
              selected === lang.code ? "bg-ink text-inverse" : "bg-surface shadow-rest"
            } ${!lang.ready ? "opacity-40" : "active:scale-[0.98]"}`}
          >
            <span className="font-medium">{lang.label}</span>
            {!lang.ready ? <span className="text-caption">Not ready yet</span> : null}
          </button>
        ))}
      </div>

      {/* Says plainly that picking a language does nothing yet, rather than
          letting a disabled row imply it's nearly there. */}
      <p className="mt-6 text-center text-caption text-muted">
        CADO is English-only for now. Arabic and French aren't translated yet, so choosing them wouldn't change
        anything on screen.
      </p>
    </div>
  );
}
