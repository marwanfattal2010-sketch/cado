/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Every colour maps to a token in index.css — nothing hardcoded in
      // components. The legacy ink/gold/cream names are kept as aliases so
      // existing classes keep working while the codebase migrates.
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-sunk": "var(--surface-sunk)",
        ink: "var(--ink)",
        muted: "var(--text-muted)",
        inverse: "var(--text-inverse)",
        // Charcoal. Primary buttons, selected chips/filters/tabs, cart badge.
        primary: {
          DEFAULT: "var(--primary)",
          deep: "var(--primary-deep)",
          tint: "var(--primary-tint)",
        },
        // Retired name, kept so un-migrated classes render charcoal rather
        // than reintroducing the old burgundy. Prefer `primary` in new code.
        ribbon: {
          DEFAULT: "var(--primary)",
          deep: "var(--primary-deep)",
          tint: "var(--primary-tint)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          deep: "var(--gold-deep)",
        },
        today: {
          DEFAULT: "var(--today)",
          tint: "var(--today-tint)",
        },
        alert: "var(--alert)",
        line: "var(--border)",
        cream: "var(--canvas)",
        // Soft section tints. Backgrounds only — see the note in index.css.
        // Not an accent set: nothing tappable is ever filled with these.
        tint: {
          sage: "var(--tint-sage)",
          blush: "var(--tint-blush)",
          sand: "var(--tint-sand)",
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        accent: ["Italiana", "serif"],
        arabic: ['"IBM Plex Sans Arabic"', "sans-serif"],
      },
      // Type scale from spec 1.2. Nothing below 12px, no weight 300 body.
      fontSize: {
        display: ["34px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
        h1: ["26px", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "600" }],
        h2: ["19px", { lineHeight: "1.25", fontWeight: "600" }],
        eyebrow: ["11px", { lineHeight: "1.2", letterSpacing: "0.14em", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.55" }],
        "product-name": ["14px", { lineHeight: "1.3", fontWeight: "500" }],
        price: ["16px", { lineHeight: "1.2", fontWeight: "700" }],
        store: ["12px", { lineHeight: "1.35" }],
        caption: ["12px", { lineHeight: "1.4" }],
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "24px",
        6: "32px",
        7: "48px",
        8: "64px",
      },
      // Only three radii exist. `sm` is kept for hairline details like the
      // focus ring; everything structural uses card/pill/sheet.
      borderRadius: {
        none: "0",
        sm: "4px",
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
        sheet: "var(--radius-sheet)",
        DEFAULT: "var(--radius-card)",
      },
      boxShadow: {
        rest: "var(--shadow-rest)",
        lift: "var(--shadow-lift)",
        none: "none",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--ease)",
        ease: "var(--ease)",
      },
      transitionDuration: {
        press: "120ms",
        fast: "140ms",
        base: "240ms",
      },
      keyframes: {
        "splash-in": {
          "0%": { opacity: "0", transform: "scale(0.9)", letterSpacing: "0.6em" },
          "100%": { opacity: "1", transform: "scale(1)", letterSpacing: "0.3em" },
        },
        "splash-fade": {
          "0%, 40%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        bump: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        // 200ms fade + a 6px slide. Deliberately ONE transform, applied to
        // one wrapper, and removed the moment it finishes — see
        // PageTransition.tsx for why leaving it on breaks sticky bars.
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // The signature motif: a ribbon/bow that draws itself.
        "draw-ribbon": {
          "0%": { strokeDashoffset: "260" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "splash-in": "splash-in 900ms var(--ease) both",
        "splash-fade": "splash-fade 1200ms ease-out both",
        bump: "bump 350ms ease-out",
        shimmer: "shimmer 1.4s ease-in-out infinite",
        "page-in": "page-in 200ms var(--ease) both",
        "fade-in": "fade-in 300ms ease-out both",
        "sheet-up": "sheet-up 240ms var(--ease) both",
        "toast-in": "toast-in 240ms var(--ease) both",
        "draw-ribbon": "draw-ribbon 900ms var(--ease) forwards",
        "tie-bow": "draw-ribbon 600ms var(--ease) forwards",
      },
    },
  },
  plugins: [],
};
