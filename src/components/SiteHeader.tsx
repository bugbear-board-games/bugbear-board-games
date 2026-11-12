"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The site header. On phones it isn't pinned: it slides away while scrolling down and
 * slides back in as soon as the visitor scrolls up. On wider screens it stays pinned
 * (the CSS only applies the hiding below 760px).
 */
export function SiteHeader({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        // Small threshold so tiny jitters (e.g. iOS bounce) don't toggle it.
        if (y < 80) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        lastY.current = y;
        ticking = false;
      });
    };
    // Show it again whenever something inside it gets keyboard focus.
    const onFocusIn = (e: FocusEvent) => {
      if ((e.target as HTMLElement)?.closest?.(".site-header")) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return <header className={`site-header${hidden ? " is-hidden" : ""}`}>{children}</header>;
}
