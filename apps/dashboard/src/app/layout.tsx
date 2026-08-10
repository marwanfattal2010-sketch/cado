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
  themeColor: "#f7f3ed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-text antialiased">{children}</body>
    </html>
  );
}
