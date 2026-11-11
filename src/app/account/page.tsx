import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { changePassword, updateProfile } from "@/actions/account";
import { ActionForm } from "@/components/ActionForm";
import { EventCard, eventCardInclude } from "@/components/EventCard";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireRole("USER");
  const rsvps = await db.rsvp.findMany({
    where: { userId: user.id, event: { startsAt: { gte: new Date() } } },
    include: { event: { include: eventCardInclude } },
    orderBy: { event: { startsAt: "asc" } },
  });

  return (
    <div className="container page narrow">
      <h1>My account</h1>
      <p>
        Signed in as <strong>{user.email}</strong>{" "}
        <span className={`role-badge role-${user.role}`}>{ROLE_LABELS[user.role as Role]}</span>
      </p>

      <section className="panel">
        <h2>My upcoming events</h2>
        {rsvps.length ? (
          <div className="event-list">{rsvps.map((r) => <EventCard key={r.id} event={r.event} />)}</div>
        ) : (
          <p className="muted">You haven&apos;t signed up for any upcoming events yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>Profile</h2>
        <ActionForm action={updateProfile} submitLabel="Save profile">
          <label>Name<input name="name" defaultValue={user.name} required maxLength={80} /></label>
        </ActionForm>
      </section>

      <section className="panel">
        <h2>Change password</h2>
        <ActionForm action={changePassword} submitLabel="Change password" resetOnSuccess>
          <label>Current password<input type="password" name="current" autoComplete="current-password" required /></label>
          <label>New password<input type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
          <label>Confirm new password<input type="password" name="confirm" autoComplete="new-password" required /></label>
        </ActionForm>
      </section>
    </div>
  );
}
