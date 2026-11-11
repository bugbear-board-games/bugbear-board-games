import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSiteContent } from "@/lib/content";
import { hasRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Community Guidelines" };

// Each paragraph is one guideline; its first sentence becomes the heading.
function parseGuidelines(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^(.+?[.!?])\s+(.+)$/);
      return m ? { title: m[1], body: m[2] } : { title: p, body: "" };
    });
}

export default async function GuidelinesPage() {
  const [user, content] = await Promise.all([getCurrentUser(), getSiteContent()]);
  const rules = parseGuidelines(content.guidelines);

  return (
    <div className="container page narrow">
      <div className="section-head">
        <h1>Community Guidelines</h1>
        {hasRole(user, "ADMIN") && <Link href="/admin#content" className="edit-link">Edit</Link>}
      </div>
      <p className="muted">
        A few ground rules so everyone at the table has a good time. Questions or concerns?{" "}
        <Link href="/contact">Reach out to our leadership team</Link>.
      </p>
      <ol className="guidelines">
        {rules.map((r, i) => (
          <li key={i} className="guideline">
            <h2>{r.title}</h2>
            {r.body && <p>{r.body}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
