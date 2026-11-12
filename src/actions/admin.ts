"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorize, isBanned } from "@/lib/auth";
import { EMAIL_RE, field, guard, type FormState } from "@/lib/forms";
import { assignableRoles, canBan, isRole, ROLE_LABELS } from "@/lib/roles";
import { EDITABLE_CONTENT } from "@/lib/content";

export async function updateSiteContent(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    await authorize("ADMIN");
    for (const { key, label } of EDITABLE_CONTENT) {
      const value = field(fd, key);
      if (!value) return { error: `${label} can't be empty.` };
      await db.siteContent.upsert({ where: { key }, update: { value }, create: { key, value } });
    }
    revalidatePath("/", "layout");
    return { success: "Site text saved." };
  });
}

export async function saveLeader(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    await authorize("ADMIN");
    const id = field(fd, "id");
    const data = {
      name: field(fd, "name"),
      title: field(fd, "title"),
      email: field(fd, "email") || null,
      phone: field(fd, "phone") || null,
      sortOrder: Number(field(fd, "sortOrder")) || 0,
    };
    if (!data.name || !data.title) return { error: "Name and title are required." };
    if (data.email && !EMAIL_RE.test(data.email)) return { error: "That email address doesn't look right." };

    if (id) await db.leadershipContact.update({ where: { id }, data });
    else await db.leadershipContact.create({ data });
    revalidatePath("/contact");
    revalidatePath("/admin");
    return { success: id ? "Contact updated." : "Contact added." };
  });
}

export async function deleteLeader(id: string) {
  await authorize("ADMIN");
  await db.leadershipContact.delete({ where: { id } });
  revalidatePath("/contact");
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, _: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const actor = await authorize("ADMIN");
    const role = field(fd, "role");
    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return { error: "User not found." };
    if (await isBanned(target.email)) return { error: `${target.name} is banned. Unban them first.` };
    if (!isRole(role) || !assignableRoles(actor, target).includes(role)) {
      return { error: "You don't have permission to assign that role." };
    }
    await db.user.update({ where: { id: userId }, data: { role } });
    revalidatePath("/admin");
    return { success: `${target.name} is now ${ROLE_LABELS[role]}.` };
  });
}

export async function transferOwnership(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const owner = await authorize("OWNER");
    const email = field(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");
    if (field(fd, "confirm") !== "TRANSFER") return { error: "Type TRANSFER to confirm." };

    const ownerRecord = await db.user.findUniqueOrThrow({ where: { id: owner.id } });
    if (!(await bcrypt.compare(password, ownerRecord.passwordHash))) return { error: "Your password is incorrect." };

    const target = await db.user.findUnique({ where: { email } });
    if (!target) return { error: "No account exists with that email. They need to sign up first." };
    if (target.id === owner.id) return { error: "You already own the site." };
    if (await isBanned(target.email)) return { error: "That account is banned." };

    // Exactly one Owner at all times: swap both roles in a single transaction.
    await db.$transaction([
      db.user.update({ where: { id: target.id }, data: { role: "OWNER" } }),
      db.user.update({ where: { id: owner.id }, data: { role: "ADMIN" } }),
    ]);
    revalidatePath("/", "layout");
    // The Owner-only form disappears for the former owner, so confirm via a banner instead.
    redirect(`/admin?transferred=${encodeURIComponent(target.name)}`);
  });
}

export async function banEmail(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const actor = await authorize("ADMIN");
    const email = field(fd, "email").toLowerCase();
    const reason = field(fd, "reason").slice(0, 500) || null;
    if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
    if (await isBanned(email)) return { error: `${email} is already banned.` };

    const target = await db.user.findUnique({ where: { email } });
    if (!canBan(actor, target)) {
      if (target?.id === actor.id) return { error: "You can't ban yourself." };
      if (target?.role === "OWNER") return { error: "The Owner can't be banned." };
      return { error: "Only the Owner can ban an Admin." };
    }

    await db.$transaction([
      db.ban.create({ data: { email, reason, bannedById: actor.id } }),
      ...(target
        ? [
            // Sign them out everywhere, drop them to Member so an unban never quietly
            // restores Organizer/Admin powers, and free their spots at upcoming events.
            db.session.deleteMany({ where: { userId: target.id } }),
            db.user.update({ where: { id: target.id }, data: { role: "USER" } }),
            db.rsvp.deleteMany({ where: { userId: target.id, event: { startsAt: { gte: new Date() } } } }),
          ]
        : []),
    ]);
    revalidatePath("/", "layout");
    return {
      success: target
        ? `${target.name} (${email}) is banned and has been signed out.`
        : `${email} is banned. No account uses it yet; it can't be used to sign up.`,
    };
  });
}

export async function unbanEmail(email: string): Promise<void> {
  await authorize("ADMIN");
  await db.ban.deleteMany({ where: { email } });
  revalidatePath("/admin");
}

// Unambiguous characters only (no 0/O, 1/l/I), so it's easy to read out or type.
const TEMP_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function temporaryPassword(): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => TEMP_CHARS[b % TEMP_CHARS.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

/**
 * Stopgap until "forgot password" emails exist: an Admin generates a temporary password,
 * shares it with the member privately, and the member changes it on their Account page.
 * Same reach as role changes and bans (never yourself or the Owner; Admins can't reset Admins).
 */
export async function resetUserPassword(userId: string, _: FormState, _fd?: FormData): Promise<FormState> {
  return guard(async () => {
    const actor = await authorize("ADMIN");
    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return { error: "User not found." };
    if (!canBan(actor, target)) return { error: "You don't have permission to reset this password." };
    if (await isBanned(target.email)) return { error: `${target.name} is banned.` };

    const password = temporaryPassword();
    await db.$transaction([
      db.user.update({ where: { id: target.id }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
      db.session.deleteMany({ where: { userId: target.id } }), // sign them out everywhere
    ]);
    return {
      success: `Temporary password for ${target.name}: ${password} — share it privately. They can change it on their Account page.`,
    };
  });
}
