import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const [user, leaders] = await Promise.all([
    getCurrentUser(),
    db.leadershipContact.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

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
              <p className="role-title">{l.title}</p>
              {l.email && <p><a href={`mailto:${l.email}`}>{l.email}</a></p>}
              {l.phone && <p><a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>{l.phone}</a></p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Leadership contacts coming soon.</p>
      )}
    </div>
  );
}
