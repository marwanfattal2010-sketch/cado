import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

/** Fades/slides new page content in on every route change (200ms ease-out). */
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page-in">
      {children}
    </div>
  );
}
