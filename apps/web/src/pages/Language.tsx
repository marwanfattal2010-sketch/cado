import { useT, type Lang } from "../lib/i18n";

/**
 * French is still listed and still disabled — nothing has been translated
 * into it, and a row that switches to a language with no words behind it is
 * worse than a row that says so.
 */
const LANGUAGES: { code: Lang | "fr"; label: string; ready: boolean }[] = [
  { code: "en", label: "English", ready: true },
  { code: "ar", label: "العربية", ready: true },
  { code: "fr", label: "Français", ready: false },
];

export function Language() {
  const { lang, setLang, t } = useT();

  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <h1 className="font-display text-h1">{t("language.title", "Language")}</h1>

      <div className="mt-7 flex flex-col gap-3">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => l.ready && setLang(l.code as Lang)}
            disabled={!l.ready}
            aria-pressed={lang === l.code}
            className={`flex min-h-[52px] items-center justify-between rounded-card px-4 py-3.5 text-left text-body transition ${
              lang === l.code ? "bg-persimmon text-white" : "bg-surface shadow-rest"
            } ${!l.ready ? "opacity-40" : "active:scale-[0.98]"}`}
          >
            <span className="font-medium">{l.label}</span>
            {!l.ready ? <span className="text-caption">Not ready yet</span> : null}
          </button>
        ))}
      </div>

      {/* Says exactly what does and does not change, so nobody switches to
          Arabic and thinks the shop is broken when a product is still in
          English. Those names belong to the stores, not to us. */}
      <p className="mt-6 text-caption text-muted">
        {t(
          "language.note",
          "Choosing a language changes the app's own wording. Store names and product names stay as the shops wrote them."
        )}
      </p>
    </div>
  );
}
