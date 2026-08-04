import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Splash } from "./Splash";

export function Layout() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <Splash />
      <Header />
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
