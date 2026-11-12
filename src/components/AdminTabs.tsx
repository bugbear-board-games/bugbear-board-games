"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type AdminTab = { id: string; label: string; content: ReactNode };

/**
 * Admin page tabs: one module visible at a time. The open tab lives in the URL hash
 * (e.g. /admin#guidelines), so "Edit" links elsewhere on the site and the back button open
 * the right tab. Hidden panels stay mounted, so unsaved typing survives switching tabs.
 */
export function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const ids = tabs.map((t) => t.id);
  const [active, setActive] = useState(ids[0]);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Follow the URL hash: on first load, on back/forward, and when an in-page link changes it.
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (ids.includes(id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // ids are stable for the life of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useCallback((id: string, focus = false) => {
    setActive(id);
    // pushState (not location.hash) so the page doesn't jump to the panel; back still works.
    if (window.location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
    if (focus) tabRefs.current[id]?.focus();
  }, []);

  // Arrow keys / Home / End move between tabs, per the WAI-ARIA tabs pattern.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = ids.indexOf(active);
    const next =
      e.key === "ArrowRight" ? ids[(i + 1) % ids.length] :
      e.key === "ArrowLeft" ? ids[(i - 1 + ids.length) % ids.length] :
      e.key === "Home" ? ids[0] :
      e.key === "End" ? ids[ids.length - 1] : null;
    if (next) { e.preventDefault(); open(next, true); }
  };

  return (
    <>
      <div className="admin-nav" role="tablist" aria-label="Admin sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            className={`btn btn-sm admin-tab${active === t.id ? " is-active" : ""}`}
            onClick={() => open(t.id)}
            onKeyDown={onKeyDown}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </>
  );
}
