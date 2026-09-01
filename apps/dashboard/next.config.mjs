/**
 * Security headers.
 *
 * The storefront ships a CSP too, so these are deliberately the same shape.
 * The dashboard is stricter in one place: there is no third-party image host,
 * so img-src stays on 'self' plus the Supabase storage origin.
 *
 * 'unsafe-inline' on style-src is required by Next's inlined critical CSS.
 * script-src avoids 'unsafe-inline' in production; in development Next's HMR
 * needs both 'unsafe-inline' and 'unsafe-eval', so the dev CSP is loosened
 * rather than the production one.
 */
const isDev = process.env.NODE_ENV !== "production";

// Strip stray quotes: a value pasted or piped into `vercel env add` can arrive
// wrapped in them, and a bare `new URL()` on that throws "Invalid URL" while
// loading the config — which fails the build with no reference to this line.
// The CSP is not worth breaking a deploy over: fall back to no Supabase origin
// and warn loudly instead.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/^["']|["']$/g, "");

let supabaseOrigin = "";
if (supabaseUrl) {
  try {
    supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    console.warn(
      `[next.config] NEXT_PUBLIC_SUPABASE_URL is not a valid URL (${JSON.stringify(supabaseUrl)}); ` +
        "CSP will omit the Supabase origin, so images and API calls will be blocked."
    );
  }
}

/** The same host over the websocket scheme, for Supabase Realtime. */
const supabaseWsOrigin = supabaseOrigin ? supabaseOrigin.replace(/^https:/, "wss:") : "";

const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  /*
   * Supabase Realtime is a WEBSOCKET, and a wss:// URL is not covered by the
   * https:// origin — CSP treats the schemes as different sources. Production
   * listed only the https origin, so every realtime connection was blocked,
   * the client retried forever, and the failures surfaced as "Application
   * error: a client-side exception has occurred" on the deployed dashboard.
   *
   * The wss origin is named explicitly rather than opening `wss:` wholesale,
   * so this permits exactly one host: our own Supabase project.
   */
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin} ${isDev ? "ws: wss:" : ""}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // The dashboard shows order and payout data. Never let it be cached
          // by a shared proxy.
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
