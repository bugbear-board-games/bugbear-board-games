import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasRole, rank, ROLE_LABELS, type Role } from "@/lib/roles";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const [user, people, bans] = await Promise.all([
    getCurrentUser(),
    // Everyone Organizer and up is listed automatically.
    db.user.findMany({
      where: { role: { in: ["ORGANIZER", "ADMIN", "OWNER"] } },
      select: { id: true, name: true, email: true, role: true, displayTitle: true, publicEmail: true },
    }),
    db.ban.findMany({ select: { email: true } }),
  ]);
  const banned = new Set(bans.map((b) => b.email));
  const leaders = people
    .filter((p) => !banned.has(p.email))
    .sort((a, b) => rank(b.role) - rank(a.role) || a.name.localeCompare(b.name));

  return (
    <div className="container page">
      <div className="section-head">
        <h1>Contact</h1>
        {hasRole(user, "ADMIN") && <Link href="/admin#leadership" className="edit-link">Edit</Link>}
      </div>
      <p className="muted">Questions about events or the community? Reach out to our leadership team.</p>
      {leaders.length ? (
        <div className="leader-grid">
          {leaders.map((l) => (
            <div key={l.id} className="leader">
              <h3>{l.name}</h3>
              <p className="role-title">{l.displayTitle || ROLE_LABELS[l.role as Role]}</p>
              {l.publicEmail && <p><a href={`mailto:${l.publicEmail}`}>{l.publicEmail}</a></p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Leadership contacts coming soon.</p>
      )}
    </div>
  );
}
