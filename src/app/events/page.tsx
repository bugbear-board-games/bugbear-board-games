import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/roles";
import { EventCard } from "@/components/EventCard";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const now = new Date();
  const include = { _count: { select: { rsvps: true } } } as const;
  const [user, upcoming, past] = await Promise.all([
    getCurrentUser(),
    db.event.findMany({ where: { startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, include }),
    db.event.findMany({ where: { startsAt: { lt: now } }, orderBy: { startsAt: "desc" }, take: 10, include }),
  ]);

  return (
    <div className="container page">
      <div className="section-head">
        <h1>Events</h1>
        {hasRole(user, "ORGANIZER") && <Link href="/events/new" className="btn btn-gold">+ New event</Link>}
      </div>

      {upcoming.length ? (
        <div className="event-list">{upcoming.map((e) => <EventCard key={e.id} event={e} />)}</div>
      ) : (
        <p className="empty">No upcoming events right now. Check back soon!</p>
      )}

      {past.length > 0 && (
        <section className="section">
          <h2>Recent events</h2>
          <div className="event-list">{past.map((e) => <EventCard key={e.id} event={e} past />)}</div>
        </section>
      )}
    </div>
  );
}
