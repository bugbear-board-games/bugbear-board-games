"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorize, createSession } from "@/lib/auth";
import { field, guard, type FormState } from "@/lib/forms";

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const user = await authorize("USER");
    const name = field(fd, "name");
    if (!name || name.length > 80) return { error: "Please enter your name (up to 80 characters)." };
    await db.user.update({ where: { id: user.id }, data: { name } });
    revalidatePath("/", "layout");
    return { success: "Profile saved." };
  });
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const user = await authorize("USER");
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("password") ?? "");
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await bcrypt.compare(current, record.passwordHash))) return { error: "Current password is incorrect." };
    if (next.length < 8) return { error: "New password must be at least 8 characters." };
    if (next !== String(fd.get("confirm") ?? "")) return { error: "New passwords don't match." };

    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
    // Sign out every other device, then start a fresh session here.
    await db.session.deleteMany({ where: { userId: user.id } });
    await createSession(user.id);
    return { success: "Password changed. Other devices have been signed out." };
  });
}
