import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { TopProgressBar } from "./TopProgressBar";
import { PageTransition } from "./PageTransition";
import { ScrollToTop } from "./ScrollToTop";

/**
 * There is deliberately NO splash screen here any more.
 *
 * It was a near-black panel showing the old gift-box logo for 4.8 seconds on
 * every fresh session. On the web that is four and a half seconds of staring
 * at a logo before you can shop. Inside the Android app it was worse: the app
 * already shows its own Persimmon splash, so opening CADO meant Persimmon,
 * then black with the old logo, then finally the shop — which reads as the
 * app having crashed and recovered.
 *
 * If a splash is ever wanted again it should be short, Persimmon, and use the
 * current logo — and it still should not run inside the app wrapper, which
 * has its own.
 */
export function Layout() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <ScrollToTop />
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
