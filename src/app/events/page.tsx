import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/roles";
import { EventCard, eventCardInclude, seriesSummary } from "@/components/EventCard";
import { topUpSeries } from "@/lib/series";
import { formatEventDate, formatTime, parseLocalDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  await topUpSeries();
  const now = new Date();
  const include = eventCardInclude;
  const [user, upcoming, past, series] = await Promise.all([
    getCurrentUser(),
    db.event.findMany({ where: { startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, include }),
    db.event.findMany({ where: { startsAt: { lt: now } }, orderBy: { startsAt: "desc" }, take: 10, include }),
    db.eventSeries.findMany({
      include: {
        events: { where: { startsAt: { gte: now }, cancelled: null }, orderBy: { startsAt: "asc" }, take: 1 },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="container page">
      <div className="section-head">
        <h1>Events</h1>
        {hasRole(user, "ORGANIZER") && <Link href="/events/new" className="btn btn-gold">+ New event</Link>}
      </div>

      {series.length > 0 && (
        <details className="series-accordion">
          <summary>
            <h2>Regular events</h2>
            <span className="series-count">{series.length}</span>
          </summary>
          <div className="series-list">
            {series.map((s) => {
              const next = s.events[0];
              return (
                <div key={s.id} className="series-item">
                  <h3>{s.title}</h3>
                  <p>
                    <span className="repeat-badge">↻ {seriesSummary(s)}</span>
                    {" · "}{formatTime(parseLocalDateTime(`${s.startDate}T${s.startTime}`)!)} · {s.locationName}
                  </p>
                  <p className="muted">
                    {next
                      ? <>Next: <Link href={`/events/${next.id}`}>{formatEventDate(next.startsAt)}</Link></>
                      : "No upcoming dates."}
                  </p>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {series.length > 0 && <h2>Upcoming</h2>}
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
