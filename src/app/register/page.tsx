import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { register } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Join" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next = "" } = await searchParams;

  return (
    <div className="container page">
      <div className="panel auth-card">
        <h1>Join the table</h1>
        <p className="muted">Create a free account to RSVP for game nights.</p>
        <ActionForm action={register} submitLabel="Create account" pendingLabel="Creating…">
          <input type="hidden" name="next" value={next} />
          <label>Name<input name="name" autoComplete="name" required maxLength={80} /></label>
          <label>Email<input type="email" name="email" autoComplete="email" required /></label>
          <label>Password <span className="muted">(at least 8 characters)</span>
            <input type="password" name="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label>Confirm password<input type="password" name="confirm" autoComplete="new-password" required /></label>
        </ActionForm>
        <p className="muted" style={{ marginTop: 20 }}>
          Already have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
