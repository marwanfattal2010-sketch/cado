import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Leaflet BEFORE index.css, so our own rules win where they overlap — the
// tile pane and the attribution both carry opinionated defaults.
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth";
import { ToastProvider } from "./components/ui";
import { I18nProvider } from "./lib/i18n";

// There is no server in front of Supabase, so every uncached query is a
// PostgREST round trip that a real visitor pays for and the database serves.
// React Query's defaults are staleTime 0 and three retries, which means the
// catalogue is refetched on every route mount and every window focus, and a
// struggling database gets four times the traffic instead of less.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Products, categories and stores change a few times a day at most.
      // Anything that must be fresh after a write (cart, orders, gift cards)
      // is already invalidated explicitly in its mutation's onSuccess, and
      // invalidation ignores staleTime.
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      // Still refetches on focus, but only once the 60s above has elapsed.
      refetchOnWindowFocus: true,
      // Back off instead of piling on when the database is already unhappy.
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Language sits outside auth and toasts: it decides the page's
            direction and typeface, which everything below inherits. */}
        <I18nProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
