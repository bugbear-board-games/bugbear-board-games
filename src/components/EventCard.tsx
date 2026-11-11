import Link from "next/link";
import { describe, type Frequency } from "@/lib/recurrence";
import { formatShort, formatTime } from "@/lib/time";

type SeriesInfo = { frequency: string; interval: number; weekday: number; weeksOfMonth: string };

type Props = {
  event: {
    id: string; title: string; locationName: string; startsAt: Date; capacity: number | null;
    cancelled?: string | null; series?: SeriesInfo | null; _count: { rsvps: number };
    imageId?: string | null; imageBackground?: string;
  };
  past?: boolean;
};

export function seriesSummary(s: SeriesInfo): string {
  return describe({
    frequency: s.frequency as Frequency,
    interval: s.interval,
    weekday: s.weekday,
    weeksOfMonth: s.weeksOfMonth ? s.weeksOfMonth.split(",").map(Number) : [],
  });
}

/** Prisma `include` for what EventCard shows. */
export const eventCardInclude = {
  _count: { select: { rsvps: true } },
  series: { select: { frequency: true, interval: true, weekday: true, weeksOfMonth: true } },
} as const;

export function EventCard({ event, past }: Props) {
  const { month, day } = formatShort(event.startsAt);
  const spotsLeft = event.capacity !== null ? event.capacity - event._count.rsvps : null;
  const cancelled = !!event.cancelled;
  return (
    <Link href={`/events/${event.id}`} className={`event-card${past ? " is-past" : ""}${cancelled ? " is-cancelled" : ""}`}>
      <div className="date-hex" aria-hidden="true">
        <span className="date-month">{month}</span>
        <span className="date-day">{day}</span>
      </div>
      <div className="event-card-body">
        <h3>{event.title}</h3>
        <p className="muted">{formatTime(event.startsAt)} · {event.locationName}</p>
        {cancelled ? (
          <p className="event-meta"><span className="cancelled-badge">Cancelled</span></p>
        ) : (
          !past && (
            <p className="event-meta">
              {event._count.rsvps} going
              {spotsLeft !== null && (spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left` : " · Full")}
            </p>
          )
        )}
        {event.series && <p className="repeat-badge">↻ {seriesSummary(event.series)}</p>}
      </div>
      {event.imageId && (
        <div className={`event-image event-thumb img-bg-${event.imageBackground ?? "TRANSPARENT"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/images/${event.imageId}`} alt="" loading="lazy" />
        </div>
      )}
    </Link>
  );
}
