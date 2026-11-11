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

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** The label (or labelled group) a field belongs to. */
function fieldBox(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target.closest<HTMLElement>("label, .field-group") : null;
}

function fieldsIn(box: HTMLElement): FieldElement[] {
  return Array.from(box.querySelectorAll<FieldElement>("input, textarea, select"));
}

function invalidMessage(el: FieldElement): string {
  const v = el.validity;
  if (v.valueMissing) return "Required";
  if (v.typeMismatch) return el.type === "email" ? "Enter a valid email" : "Check the format";
  if (v.tooShort && "minLength" in el) return `At least ${el.minLength} characters`;
  if (v.rangeUnderflow && "min" in el) return `Minimum ${el.min}`;
  return "Check the format";
}

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

  // When the browser blocks a submit (empty required field, bad format), tag the field's
  // label with a short notice like "Required", and clear it once the field is fixed.
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    let scrollQueued = false;
    const onInvalid = (e: Event) => {
      const field = e.target as FieldElement;
      const box = fieldBox(field);
      if (box) {
        box.dataset.invalidMsg = invalidMessage(field);
        box.classList.add("is-invalid");
      }
      // The first "invalid" of a submit attempt is the first bad field on the page; bring it
      // (and its label) into the middle of the screen rather than relying on browser defaults.
      if (!scrollQueued) {
        scrollQueued = true;
        requestAnimationFrame(() => {
          (box ?? field).scrollIntoView({ block: "center", behavior: "smooth" });
          field.focus({ preventScroll: true });
          scrollQueued = false;
        });
      }
    };
    const onEdit = (e: Event) => {
      const box = fieldBox(e.target);
      if (box?.classList.contains("is-invalid") && fieldsIn(box).every((f) => f.validity.valid)) {
        box.classList.remove("is-invalid");
      }
    };
    form.addEventListener("invalid", onInvalid, true); // "invalid" doesn't bubble, so listen in the capture phase
    form.addEventListener("input", onEdit, true);
    form.addEventListener("change", onEdit, true);
    return () => {
      form.removeEventListener("invalid", onInvalid, true);
      form.removeEventListener("input", onEdit, true);
      form.removeEventListener("change", onEdit, true);
    };
  }, []);

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
