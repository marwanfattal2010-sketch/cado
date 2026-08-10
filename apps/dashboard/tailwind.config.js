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
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
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
