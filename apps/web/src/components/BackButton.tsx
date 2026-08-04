import { useLocation, useNavigate } from "react-router-dom";

export function BackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname === "/") return null;

  return (
    <div className="mx-auto max-w-6xl px-6 pt-5">
      <button
        onClick={() => navigate(-1)}
        aria-label="Go back"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-ink/60 shadow-sm ring-1 ring-ink/10 transition hover:bg-white hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </div>
  );
}
