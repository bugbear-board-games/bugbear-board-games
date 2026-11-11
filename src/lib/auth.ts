import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { hasRole, type Role } from "./roles";

const COOKIE = "bb_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  // Only the hash is stored, so a leaked database cannot be used to hijack sessions.
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}

export async function isBanned(email: string): Promise<boolean> {
  return !!(await db.ban.findUnique({ where: { email: email.toLowerCase() } }));
}

export const BANNED_MESSAGE =
  "This email has been banned from Bugbear Board Games. If you think this is a mistake, please contact our leadership team.";

export type CurrentUser = { id: string; email: string; name: string; role: string };

/** The signed-in user, or null. Cached for the duration of one request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  // Banning also deletes sessions; this catches any created in a race with the ban.
  if (await isBanned(session.user.email)) return null;
  return session.user;
});

/** For pages: redirect to sign-in (or home) unless the user has at least `minimum` role. */
export async function requireRole(minimum: Role = "USER"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasRole(user, minimum)) redirect("/");
  return user;
}

/** For server actions: throws instead of redirecting. */
export async function authorize(minimum: Role = "USER"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, minimum)) throw new Error("You don't have permission to do that.");
  return user;
}
