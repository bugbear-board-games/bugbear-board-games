import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { deleteSeriesImage, updateSeries } from "@/actions/events";
import { EventForm, type RepeatValues } from "@/components/EventForm";
import { seriesSummary } from "@/components/EventCard";
import { ruleOf } from "@/lib/series";
import { parseLocalDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Edit series" };

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ORGANIZER");
  const { id } = await params;
  const series = await db.eventSeries.findUnique({ where: { id } });
  if (!series) notFound();

  const next = await db.event.findFirst({
    where: { seriesId: id, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    select: { id: true },
  });
  const startsAt = parseLocalDateTime(`${series.startDate}T${series.startTime}`)!;
  const rule = ruleOf(series);
  const repeat: RepeatValues = {
    repeat: rule.frequency === "MONTHLY" ? "MONTHLY" : rule.interval === 2 ? "BIWEEKLY" : "WEEKLY",
    weekday: rule.weekday,
    weeksOfMonth: rule.weeksOfMonth,
  };

  return (
    <div className="container page narrow">
      <Link href={next ? `/events/${next.id}` : "/events"} className="back-link">← Back</Link>
      <div className="panel">
        <h1>Edit series</h1>
        <p className="muted">
          Currently <strong>{seriesSummary(series)}</strong>. Changes apply to every upcoming date in the series.
          To stop it, delete the series from any of its dates.
        </p>
        <EventForm
          action={updateSeries.bind(null, series.id)}
          deleteImage={deleteSeriesImage.bind(null, series.id)}
          event={{
            title: series.title,
            description: series.description,
            locationName: series.locationName,
            address1: series.address1,
            address2: series.address2,
            city: series.city,
            state: series.state,
            zip: series.zip,
            capacity: series.capacity,
            imageId: series.imageId,
            imageBackground: series.imageBackground,
            startsAt,
            endsAt: series.durationMinutes ? new Date(startsAt.getTime() + series.durationMinutes * 60_000) : null,
          }}
          repeat={repeat}
          repeatMode="required"
          submitLabel="Save series"
        />
      </div>
    </div>
  );
}
