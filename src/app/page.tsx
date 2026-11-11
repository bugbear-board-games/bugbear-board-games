import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSiteContent } from "@/lib/content";
import { hasRole } from "@/lib/roles";
import { EventCard } from "@/components/EventCard";

export default async function HomePage() {
  const [user, content, events, leaders] = await Promise.all([
    getCurrentUser(),
    getSiteContent(),
    db.event.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
      include: { _count: { select: { rsvps: true } } },
    }),
    db.leadershipContact.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const isAdmin = hasRole(user, "ADMIN");

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <Image
            src="/logo.png"
            alt="Bugbear Board Games logo: a friendly bugbear in glasses playing a board game"
            width={520}
            height={546}
            className="hero-logo"
            priority
          />
          <div>
            <h1>Bugbear Board Games</h1>
            <p className="tagline">{content.tagline}</p>
            <div className="hero-actions">
              <Link href="/events" className="btn btn-gold">See upcoming events</Link>
              {!user && <Link href="/register" className="btn btn-purple">Join the community</Link>}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className="container">
          <div className="section-head">
            <h2>Our Mission</h2>
            {isAdmin && <Link href="/admin#content" className="edit-link">Edit</Link>}
          </div>
          <div className="panel mission">
            {content.mission.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
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

      <section id="contact" className="section">
        <div className="container">
          <div className="section-head">
            <h2>Leadership</h2>
            {isAdmin && <Link href="/admin#leadership" className="edit-link">Edit</Link>}
          </div>
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
      </section>
    </>
  );
}
