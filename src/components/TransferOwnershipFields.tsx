"use client";

import { useState, type InputHTMLAttributes } from "react";

/**
 * Inputs for transferring ownership. This must be filled in deliberately, so every layer of
 * autofill is blocked:
 * - neutral field names (not "email"/"password"), so the form doesn't look like a sign-in;
 * - autocomplete="off" / "new-password" (browsers won't fill saved logins into new-password);
 * - opt-out flags for 1Password, LastPass and Bitwarden;
 * - read-only until the field is focused, so nothing can be filled in when the page loads.
 */
function DeliberateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [locked, setLocked] = useState(true);
  return (
    <input
      {...props}
      readOnly={locked}
      onFocus={() => setLocked(false)}
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-1p-ignore="true"
      data-lpignore="true"
      data-bwignore="true"
      data-form-type="other"
    />
  );
}

export function TransferOwnershipFields() {
  return (
    <>
      <label>
        New owner&apos;s email
        <DeliberateInput type="email" name="newOwnerEmail" required autoComplete="off" defaultValue="" />
      </label>
      <label>
        Your password <span className="muted">(to confirm it&apos;s you)</span>
        <DeliberateInput type="password" name="ownerPassword" required autoComplete="new-password" defaultValue="" />
      </label>
      <label>
        <span>Type <code>TRANSFER</code> to confirm</span>
        <DeliberateInput name="transferConfirm" required autoComplete="off" defaultValue="" />
      </label>
    </>
  );
}
