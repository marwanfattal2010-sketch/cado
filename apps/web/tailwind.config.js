/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17140F",
        gold: "#C9A24B",
        cream: "#F7F2E9",
      },
      fontFamily: {
        display: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        accent: ["Italiana", "serif"],
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
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          // Ends at `none`, not translateY(0): a lingering transform would
          // make this wrapper a containing block and break position:fixed
          // for anything rendered inside a page.
          "100%": { opacity: "1", transform: "none" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "splash-in": "splash-in 900ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "splash-fade": "splash-fade 1200ms ease-out both",
        bump: "bump 350ms ease-out",
        shimmer: "shimmer 1.4s ease-in-out infinite",
        "page-in": "page-in 200ms ease-out both",
        "fade-in": "fade-in 300ms ease-out both",
      },
    },
  },
  plugins: [],
};
