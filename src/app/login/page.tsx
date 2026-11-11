import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { login } from "@/actions/auth";
import { ActionForm } from "@/components/ActionForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next = "" } = await searchParams;

  return (
    <div className="container page">
      <div className="panel auth-card">
        <h1>Welcome back</h1>
        <ActionForm action={login} submitLabel="Sign in" pendingLabel="Signing in…">
          <input type="hidden" name="next" value={next} />
          <label>Email<input type="email" name="email" autoComplete="email" required /></label>
          <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
        </ActionForm>
        <p className="muted" style={{ marginTop: 20 }}>
          New here? <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
