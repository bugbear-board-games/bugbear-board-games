"use client";

import { useState, useTransition } from "react";

/** A destructive button that asks "Are you sure?" inline before running. */
export function ConfirmButton({ action, label, confirmLabel = "Yes, delete" }: {
  action: () => Promise<void>;
  label: string;
  confirmLabel?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return <button type="button" className="btn btn-danger-ghost" onClick={() => setAsking(true)}>{label}</button>;
  }
  return (
    <span className="confirm-row">
      <span className="muted">Are you sure?</span>
      <button type="button" className="btn btn-danger" disabled={pending} onClick={() => startTransition(() => action())}>
        {pending ? "Working…" : confirmLabel}
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}
