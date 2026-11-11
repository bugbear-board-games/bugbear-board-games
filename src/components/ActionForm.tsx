"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FormState } from "@/lib/forms";

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  buttonClassName?: string;
  /** Clear the fields after a successful submit (e.g. "add new" forms). */
  resetOnSuccess?: boolean;
};

/**
 * A form wired to a server action, showing error/success messages.
 * Submits via onSubmit so typed values are kept when validation fails
 * (React would otherwise reset the fields after every submission).
 */
export function ActionForm({
  action, children, submitLabel, pendingLabel = "Saving…", className = "form", buttonClassName = "btn btn-gold", resetOnSuccess,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {children}
      {state.error && <p className="msg msg-error" role="alert">{state.error}</p>}
      {state.success && <p className="msg msg-success" role="status">{state.success}</p>}
      <div>
        <button type="submit" className={buttonClassName} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
