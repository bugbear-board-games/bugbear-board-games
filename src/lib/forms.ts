export type FormState = { error?: string; success?: string };

export function field(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function isNextControlFlow(e: unknown): boolean {
  // redirect() and notFound() throw special errors that Next.js must receive.
  const digest = e && typeof e === "object" && "digest" in e ? (e as { digest: unknown }).digest : null;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR") || digest === "NEXT_NOT_FOUND");
}

/** Run an action body, turning thrown errors into a form error message. */
export async function guard(fn: () => Promise<FormState | void>): Promise<FormState> {
  try {
    return (await fn()) ?? {};
  } catch (e) {
    if (isNextControlFlow(e)) throw e;
    console.error(e);
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
