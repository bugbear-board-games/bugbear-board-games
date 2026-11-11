import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasRole } from "@/lib/roles";
import { formatEventDate, formatShort, formatTime } from "@/lib/time";
import { deleteEvent, toggleRsvp } from "@/actions/events";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";

type Params = { params: Promise<{ id: string }> };

async function getEvent(id: string) {
  return db.event.findUnique({
    where: { id },
    include: {
      rsvps: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      createdBy: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const event = await getEvent((await params).id);
  return { title: event?.title ?? "Event not found" };
}

export default async function EventPage({ params }: Params) {
  const { id } = await params;
  const [event, user] = await Promise.all([getEvent(id), getCurrentUser()]);
  if (!event) notFound();

  const isOrganizer = hasRole(user, "ORGANIZER");
  const going = event.rsvps.length;
  const isGoing = !!user && event.rsvps.some((r) => r.user.id === user.id);
  const isPast = (event.endsAt ?? event.startsAt) < new Date();
  const isFull = event.capacity !== null && going >= event.capacity;
  const { month, day } = formatShort(event.startsAt);

  return (
    <div className="container page narrow">
      <Link href="/events" className="back-link">← All events</Link>
      <article className="panel">
        <div className="event-detail-head">
          <div className="date-hex" aria-hidden="true">
            <span className="date-month">{month}</span>
            <span className="date-day">{day}</span>
          </div>
          <h1 style={{ margin: 0 }}>{event.title}</h1>
        </div>

        <div className="event-facts">
          <div><strong>When</strong> {formatEventDate(event.startsAt)}, {formatTime(event.startsAt)}{event.endsAt && ` – ${formatTime(event.endsAt)}`}</div>
          <div><strong>Where</strong> {event.location}</div>
          <div><strong>Going</strong> {going}{event.capacity !== null && ` of ${event.capacity}`}{isFull && " (full)"}</div>
          {event.createdBy && <div><strong>Host</strong> {event.createdBy.name}</div>}
        </div>

        <p className="event-description">{event.description}</p>

        {isPast ? (
          <p className="muted">This event has already happened.</p>
        ) : user ? (
          (!isFull || isGoing) && (
            <ActionForm
              action={toggleRsvp.bind(null, event.id)}
              submitLabel={isGoing ? "Cancel my RSVP" : "I'm going!"}
              pendingLabel="One moment…"
              buttonClassName={isGoing ? "btn btn-ghost" : "btn btn-gold"}
            >
              {isGoing && <p className="muted" style={{ margin: 0 }}>You&apos;re signed up for this event.</p>}
            </ActionForm>
          )
        ) : (
          <Link href={`/login?next=/events/${event.id}`} className="btn btn-gold">Sign in to RSVP</Link>
        )}
        {!isPast && isFull && !isGoing && user && <p className="msg msg-error">This event is full.</p>}
      </article>

      {isOrganizer && (
        <section className="panel">
          <div className="section-head">
            <h2 style={{ fontSize: "1.4rem" }}>Organizer tools</h2>
            <div className="toolbar">
              <Link href={`/events/${event.id}/edit`} className="btn btn-purple btn-sm">Edit event</Link>
              <ConfirmButton action={deleteEvent.bind(null, event.id)} label="Delete" confirmLabel="Yes, delete event" />
            </div>
          </div>
          <h3>Attendees ({going})</h3>
          {going ? (
            <ol className="attendees">{event.rsvps.map((r) => <li key={r.id}>{r.user.name}</li>)}</ol>
          ) : (
            <p className="muted">No RSVPs yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
