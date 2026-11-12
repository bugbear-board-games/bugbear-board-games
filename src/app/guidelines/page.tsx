import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Community Guidelines" };

export default async function GuidelinesPage() {
  const [user, rules] = await Promise.all([
    getCurrentUser(),
    db.guideline.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);

  return (
    <div className="container page narrow">
      <div className="section-head">
        <h1>Community Guidelines</h1>
        {hasRole(user, "ADMIN") && <Link href="/admin#guidelines" className="edit-link">Edit</Link>}
      </div>
      <p className="muted">
        A few ground rules so everyone at the table has a good time. Questions or concerns?{" "}
        <Link href="/contact">Reach out to our leadership team</Link>.
      </p>
      {rules.length ? (
        <ol className="guidelines">
          {rules.map((r) => (
            <li key={r.id} className="guideline">
              <h2>{r.title}</h2>
              {r.body && <p className="preserve-format">{r.body}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty">Guidelines coming soon.</p>
      )}
    </div>
  );
}
