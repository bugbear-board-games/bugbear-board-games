import "server-only";
import type { EventSeries } from "@prisma/client";
import { db } from "./db";
import { addDays, matches, occurrences, type Frequency, type RepeatRule } from "./recurrence";
import { parseLocalDateTime, todayLocal } from "./time";

/** How far ahead each series' dates are created, so members can RSVP to them. */
export const HORIZON_DAYS = 60;

export function ruleOf(s: Pick<EventSeries, "frequency" | "interval" | "weekday" | "weeksOfMonth" | "startDate">): RepeatRule {
  return {
    frequency: s.frequency as Frequency,
    interval: s.interval,
    weekday: s.weekday,
    weeksOfMonth: s.weeksOfMonth ? s.weeksOfMonth.split(",").map(Number) : [],
    startDate: s.startDate,
    endDate: null, // series repeat until deleted
  };
}

function timesFor(s: EventSeries, date: string) {
  const startsAt = parseLocalDateTime(`${date}T${s.startTime}`)!;
  const endsAt = s.durationMinutes ? new Date(startsAt.getTime() + s.durationMinutes * 60_000) : null;
  return { startsAt, endsAt };
}

/**
 * Bring a series' upcoming dates in line with its schedule and details:
 * - creates any missing dates up to HORIZON_DAYS ahead,
 * - copies the series' details onto dates that haven't been edited on their own,
 * - removes dates that no longer fit the schedule, or marks them cancelled if people RSVPed.
 * Past dates are never touched.
 */
export async function syncSeries(seriesId: string): Promise<void> {
  const s = await db.eventSeries.findUnique({ where: { id: seriesId } });
  if (!s) return;
  const rule = ruleOf(s);
  const today = todayLocal();
  const from = s.startDate > today ? s.startDate : today;
  const horizonEnd = addDays(today, HORIZON_DAYS);

  let dates = occurrences(rule, from, horizonEnd);
  // A series starting beyond the horizon still gets its first date, so it shows up.
  if (!dates.length) dates = occurrences(rule, from, addDays(from, 400)).slice(0, 1);

  const details = {
    title: s.title, description: s.description, capacity: s.capacity,
    locationName: s.locationName, address1: s.address1, address2: s.address2, city: s.city, state: s.state, zip: s.zip,
    imageId: s.imageId, imageBackground: s.imageBackground,
  };
  const existing = await db.event.findMany({
    where: { seriesId: s.id, occurrenceDate: { gte: today } },
    include: { _count: { select: { rsvps: true } } },
  });
  const have = new Set(existing.map((e) => e.occurrenceDate));

  for (const e of existing) {
    if (e.customized) continue;
    if (matches(rule, e.occurrenceDate!)) {
      await db.event.update({
        where: { id: e.id },
        data: {
          ...details,
          ...timesFor(s, e.occurrenceDate!),
          cancelled: e.cancelled === "SCHEDULE" ? null : e.cancelled,
        },
      });
    } else if (e._count.rsvps > 0) {
      // Keep it so people who signed up see it was cancelled rather than having it vanish.
      if (!e.cancelled) await db.event.update({ where: { id: e.id }, data: { cancelled: "SCHEDULE" } });
    } else {
      await db.event.delete({ where: { id: e.id } });
    }
  }

  for (const date of dates) {
    if (have.has(date)) continue;
    // upsert, not create, in case two page loads sync the same series at once.
    await db.event.upsert({
      where: { seriesId_occurrenceDate: { seriesId: s.id, occurrenceDate: date } },
      update: {},
      create: { ...details, ...timesFor(s, date), seriesId: s.id, occurrenceDate: date, createdById: s.createdById },
    });
  }

  await db.eventSeries.update({ where: { id: s.id }, data: { generatedThrough: horizonEnd } });
}

/**
 * Called when event lists load: extends any series whose dates run out within a week.
 * Usually a single cheap query that finds nothing to do.
 */
export async function topUpSeries(): Promise<void> {
  const today = todayLocal();
  const stale = await db.eventSeries.findMany({
    where: { OR: [{ generatedThrough: null }, { generatedThrough: { lt: addDays(today, HORIZON_DAYS - 7) } }] },
    select: { id: true },
  });
  for (const { id } of stale) await syncSeries(id);
}
