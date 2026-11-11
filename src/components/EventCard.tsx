import Link from "next/link";
import { formatShort, formatTime } from "@/lib/time";

type Props = {
  event: { id: string; title: string; location: string; startsAt: Date; capacity: number | null; _count: { rsvps: number } };
  past?: boolean;
};

export function EventCard({ event, past }: Props) {
  const { month, day } = formatShort(event.startsAt);
  const spotsLeft = event.capacity !== null ? event.capacity - event._count.rsvps : null;
  return (
    <Link href={`/events/${event.id}`} className={`event-card${past ? " is-past" : ""}`}>
      <div className="date-hex" aria-hidden="true">
        <span className="date-month">{month}</span>
        <span className="date-day">{day}</span>
      </div>
      <div className="event-card-body">
        <h3>{event.title}</h3>
        <p className="muted">{formatTime(event.startsAt)} · {event.location}</p>
        {!past && (
          <p className="event-meta">
            {event._count.rsvps} going
            {spotsLeft !== null && (spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left` : " · Full")}
          </p>
        )}
      </div>
    </Link>
  );
}
