import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { activeAnnouncements, getSiteContent } from "@/lib/content";
import { hasRole } from "@/lib/roles";
import { platformLabel } from "@/lib/social";
import { formatEventDate } from "@/lib/time";
import { EventCard, eventCardInclude } from "@/components/EventCard";
import { topUpSeries } from "@/lib/series";

export default async function HomePage() {
  await topUpSeries();
  const [user, content, events, announcements, socialLinks] = await Promise.all([
    getCurrentUser(),
    getSiteContent(),
    db.event.findMany({
      where: { startsAt: { gte: new Date() }, cancelled: null },
      orderBy: { startsAt: "asc" },
      take: 3,
      include: eventCardInclude,
    }),
    activeAnnouncements(),
    db.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const isAdmin = hasRole(user, "ADMIN");

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="logo-frame hero-logo">
            <Image
              src="/logo.png"
              alt="Bugbear Board Games logo: a friendly bugbear in glasses playing a board game"
              width={520}
              height={546}
              priority
            />
          </div>
          <div>
            <h1>Bugbear Board Games</h1>
            <p className="tagline">{content.tagline}</p>
            <div className="hero-actions">
              <Link href="/events" className="btn btn-gold">See upcoming events</Link>
              {!user && <Link href="/register" className="btn btn-purple">Join the community</Link>}
            </div>
            {socialLinks.length > 0 && (
              <div className="social-links">
                <span className="social-label">Find us online</span>
                <ul>
                  {socialLinks.map((l) => (
                    <li key={l.id}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="social-chip">
                        {platformLabel(l.platform)} <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {announcements.length > 0 && (
        <section className="section announcements-section" aria-labelledby="announcements-heading">
          <div className="container">
            <div className="section-head">
              <h2 id="announcements-heading">Announcements</h2>
              {isAdmin && <Link href="/admin#announcements" className="edit-link">Edit</Link>}
            </div>
            <div className="announcement-list">
              {announcements.map((a) => (
                <article key={a.id} className="announcement">
                  <h3>{a.title}</h3>
                  <p className="preserve-format">{a.body}</p>
                  <p className="muted announcement-date">Posted {formatEventDate(a.createdAt)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="about" className="section">
        <div className="container">
          {isAdmin && (
            <div className="section-head section-head-end">
              <Link href="/admin#content" className="edit-link">Edit</Link>
            </div>
          )}
          {content.mission.trim() ? (
            // Shown exactly as typed in Admin: line breaks and spacing are kept.
            <div className="panel mission preserve-format">{content.mission.trim()}</div>
          ) : (
            isAdmin && <p className="empty">No blurb yet. Use Edit to add a short description of the community.</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Upcoming Events</h2>
            <Link href="/events" className="edit-link">All events →</Link>
          </div>
          {events.length ? (
            <div className="event-list">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <p className="empty">No events scheduled yet. Check back soon!</p>
          )}
        </div>
      </section>
    </>
  );
}
