import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BackButton } from "./BackButton";

export function Layout() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <Header />
      <BackButton />
      <main>
        <Outlet />
      </main>
      <footer className="mt-24 border-t border-ink/10 py-10 text-center text-xs tracking-widest text-ink/40">
        CADO — GIFTS, DELIVERED. LEBANON.
      </footer>
    </div>
  );
}
