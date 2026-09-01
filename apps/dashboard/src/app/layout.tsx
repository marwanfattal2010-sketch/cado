import type { Metadata, Viewport } from "next";
import "./globals.css";
import { t } from "@/lib/dictionary";

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.tagline"),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7f1",
};

/**
 * Sets the theme BEFORE first paint. A React effect would run after hydration
 * and show one frame of the wrong theme on every single load.
 *
 * DEFAULT IS LIGHT. The dark theme is still there behind the toggle and the
 * whole design works in both, but a back-office someone stares at all day is
 * their choice to make, and this one's owner does not want dark.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('cado-theme');document.documentElement.setAttribute('data-theme',t==='midnight'?'midnight':'paper')}catch(e){document.documentElement.setAttribute('data-theme','paper')}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="paper" suppressHydrationWarning>
      <head>
        {/* One family, loaded once. Weights match the design system. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-screen bg-canvas text-text antialiased">{children}</body>
    </html>
  );
}
