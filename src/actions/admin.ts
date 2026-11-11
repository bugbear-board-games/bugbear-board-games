"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { EMAIL_RE, field, guard, type FormState } from "@/lib/forms";
import { assignableRoles, isRole, ROLE_LABELS } from "@/lib/roles";
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
