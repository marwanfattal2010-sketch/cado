import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";

const MIN_VISIBLE_MS = 320;

/**
 * A thin progress bar tied to real loading state (React Query's global fetch
 * count) rather than a fixed timer: it holds while data is genuinely in
 * flight, then completes. It also runs on navigations to already-cached
 * pages — with a minimum on-screen time so the bar is actually seen instead
 * of flashing for a single frame.
 *
 * Unmounts entirely when idle, so each navigation starts from a clean 0%
 * with no backwards width animation to suppress.
 */
export function TopProgressBar() {
  const isFetching = useIsFetching();
  const { pathname } = useLocation();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const [fading, setFading] = useState(false);
  const startedAt = useRef(0);

  // Start on every navigation.
  useEffect(() => {
    startedAt.current = Date.now();
    setActive(true);
    setFading(false);
    setWidth(0);
    const grow = requestAnimationFrame(() => setWidth(70));
    return () => cancelAnimationFrame(grow);
  }, [pathname]);

  // Complete once nothing is in flight.
  useEffect(() => {
    if (!active) return;
    if (isFetching > 0) return;

    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    const finish = setTimeout(() => {
      setWidth(100);
      setFading(true);
    }, wait);
    return () => clearTimeout(finish);
  }, [isFetching, active, pathname]);

  // Unmount after the fade so the next navigation restarts from zero.
  useEffect(() => {
    if (!fading) return;
    const done = setTimeout(() => setActive(false), 260);
    return () => clearTimeout(done);
  }, [fading]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className={`fixed left-0 top-0 z-50 h-[3px] bg-gold transition-[width,opacity] duration-300 ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ width: `${width}%` }}
    />
  );
}
