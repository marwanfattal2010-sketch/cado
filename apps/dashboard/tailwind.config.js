/**
 * Design tokens copied 1:1 from apps/web/src/index.css so the dashboard reads
 * as the same product as the storefront. The token VALUES live in
 * src/app/globals.css; this file only maps Tailwind names onto them.
 *
 * Status colours (spec): amber awaiting action, green confirmed, blue in
 * progress, grey completed, red rejected/cancelled. These map onto the
 * storefront's existing semantic tokens where they line up (green = --today,
 * red = --ribbon) and add amber/blue/grey the storefront didn't need.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-sunk": "var(--surface-sunk)",
        ink: "var(--ink)",
        text: "var(--text)",
        muted: "var(--text-muted)",
        inverse: "var(--text-inverse)",
        ribbon: {
          DEFAULT: "var(--ribbon)",
          deep: "var(--ribbon-deep)",
          tint: "var(--ribbon-tint)",
        },
        "surface-raised": "var(--surface-raised)",
        secondary: "var(--text-secondary)",
        "line-strong": "var(--border-strong)",
        gold: "var(--gold)",
        today: { DEFAULT: "var(--today)", tint: "var(--today-tint)" },
        alert: "var(--alert)",
        line: "var(--border)",
        // Status palette
        "status-amber": { DEFAULT: "var(--status-amber)", tint: "var(--status-amber-tint)" },
        "status-green": { DEFAULT: "var(--status-green)", tint: "var(--status-green-tint)" },
        "status-blue": { DEFAULT: "var(--status-blue)", tint: "var(--status-blue-tint)" },
        "status-grey": { DEFAULT: "var(--status-grey)", tint: "var(--status-grey-tint)" },
        "status-red": { DEFAULT: "var(--status-red)", tint: "var(--status-red-tint)" },
        "status-indigo": { DEFAULT: "var(--status-indigo)", tint: "var(--status-indigo-tint)" },
        "status-purple": { DEFAULT: "var(--status-purple)", tint: "var(--status-purple-tint)" },
      },
      /*
       * ONE family. The storefront's Fraunces/Inter pairing is a shop's voice;
       * a back-office wants a single neutral face so nothing competes with the
       * numbers. `display` is kept pointing at the same family so the pages
       * still carrying font-display keep working while they are migrated.
       */
      fontFamily: {
        display: ['"Manrope"', "system-ui", "sans-serif"],
        body: ['"Manrope"', "system-ui", "sans-serif"],
      },
      fontSize: {
        "table": ["13px", { lineHeight: "18px" }],
        "kpi": ["28px", { lineHeight: "32px", fontWeight: "700" }],
        "page-title": ["22px", { lineHeight: "28px", fontWeight: "600" }],
        "section": ["14px", { lineHeight: "20px", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "4px",
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
        sheet: "var(--radius-sheet)",
      },
      boxShadow: {
        rest: "var(--shadow-rest)",
        lift: "var(--shadow-lift)",
        /* V2 cards: barely-there. Heavy shadows read as consumer app. */
        card: "0 1px 2px rgba(23, 19, 15, 0.05)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: { shimmer: "shimmer 1.4s ease-in-out infinite" },
    },
  },
  plugins: [],
};
