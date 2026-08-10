import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Splash } from "./Splash";
import { TopProgressBar } from "./TopProgressBar";
import { PageTransition } from "./PageTransition";
import { ScrollToTop } from "./ScrollToTop";

export function Layout() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <ScrollToTop />
      <Splash />
      <TopProgressBar />
      <Header />
      <main className="pb-24">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
