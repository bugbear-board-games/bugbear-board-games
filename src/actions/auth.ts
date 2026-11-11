"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BANNED_MESSAGE, createSession, destroySession, isBanned } from "@/lib/auth";
import { EMAIL_RE, field, guard, type FormState } from "@/lib/forms";

// Used so a login for an unknown email takes as long as a real one.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

// Basic in-memory brute-force protection. Resets when the server restarts;
// move to Redis or the database if the site ever runs on multiple servers.
const attempts = new Map<string, { count: number; resetAt: number }>();
function tooManyAttempts(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const name = field(fd, "name");
    const email = field(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    if (!name || name.length > 80) return { error: "Please enter your name (up to 80 characters)." };
    if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
    if (password.length < 8) return { error: "Password must be at least 8 characters." };
    if (password !== confirm) return { error: "Passwords don't match." };
    if (await isBanned(email)) return { error: BANNED_MESSAGE };
    if (await db.user.findUnique({ where: { email } })) {
      return { error: "An account with that email already exists. Try signing in." };
    }

    const user = await db.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: "USER" },
    });
    await createSession(user.id);
    redirect(safeNext(field(fd, "next")) ?? "/events");
  });
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const email = field(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");
    if (tooManyAttempts(email)) return { error: "Too many attempts. Please wait 15 minutes and try again." };

    const user = await db.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) return { error: "Incorrect email or password." };
    // Checked only after the password, so the form doesn't reveal which emails are banned.
    if (await isBanned(email)) return { error: BANNED_MESSAGE };

    attempts.delete(email);
    await createSession(user.id);
    redirect(safeNext(field(fd, "next")) ?? "/");
  });
}

export async function logout() {
  await destroySession();
  redirect("/");
}
