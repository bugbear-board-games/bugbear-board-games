"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { field, guard, type FormState } from "@/lib/forms";
import { addDays, occurrences, type RepeatRule } from "@/lib/recurrence";
import { deleteUnusedImages, parseImageFields } from "@/lib/images";
import { parseLocation } from "@/lib/location";
import { syncSeries } from "@/lib/series";
import { parseLocalDateTime, todayLocal, toLocalInputValue } from "@/lib/time";

const isRepeating = (fd: FormData) => field(fd, "repeats") === "on";

function parseEvent(fd: FormData) {
  const title = field(fd, "title");
  const description = field(fd, "description");
  const startDate = field(fd, "startDate");
  const startTime = field(fd, "startTime");
  const startsAt = startDate && startTime ? parseLocalDateTime(`${startDate}T${startTime}`) : null;
  // End date defaults to the start date; the form fills it in, but don't rely on that.
  const endTime = field(fd, "endTime");
  const endDate = field(fd, "endDate") || startDate;
  const endsAt = endTime ? parseLocalDateTime(`${endDate}T${endTime}`) : null;
  const capRaw = field(fd, "capacity");
  const capacity = capRaw ? Number(capRaw) : null;

  if (!title || title.length > 120) return { error: "Title is required (up to 120 characters)." };
  if (!description) return { error: "Please add a description." };
  const location = parseLocation(fd);
  if ("error" in location) return { error: location.error };
  if (!startsAt) return { error: "Please choose a start date and time." };
  if (!endTime) return { error: "Please add an end time." };
  if (!endsAt) return { error: "The end date or time is invalid." };
  if (endsAt <= startsAt) {
    return { error: "The event must end after it starts. For events that run past midnight, set the end date to the next day." };
  }
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
    return { error: "Capacity must be a whole number of at least 1, or left blank." };
  }
  return { data: { title, description, ...location.data, startsAt, endsAt, capacity } };
}

type EventData = Extract<ReturnType<typeof parseEvent>, { data: unknown }>["data"];

/** Reads the "Repeats" fields. Returns null for a one-time event. */
function parseRepeat(fd: FormData, event: EventData) {
  if (!isRepeating(fd)) return null;
  const repeat = field(fd, "repeat");
  if (!["WEEKLY", "BIWEEKLY", "MONTHLY"].includes(repeat)) return { error: "Please choose how often it repeats." };

  const weekday = Number(field(fd, "weekday"));
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { error: "Please choose a day of the week." };
  const weeks = fd.getAll("weeks").map(Number).filter((n) => [1, 2, 3, 4, -1].includes(n));
  if (repeat === "MONTHLY" && !weeks.length) {
    return { error: "Choose at least one week of the month (for example, First and Third)." };
  }

  const local = toLocalInputValue(event.startsAt); // "YYYY-MM-DDTHH:mm" in Pittsburgh time
  const startDate = local.slice(0, 10);

  const rule: RepeatRule = {
    frequency: repeat === "MONTHLY" ? "MONTHLY" : "WEEKLY",
    interval: repeat === "BIWEEKLY" ? 2 : 1,
    weekday,
    weeksOfMonth: repeat === "MONTHLY" ? [...new Set(weeks)] : [],
    startDate,
    endDate: null,
  };
  const from = startDate > todayLocal() ? startDate : todayLocal();
  if (!occurrences(rule, from, addDays(from, 400)).length) {
    return { error: "That schedule has no upcoming dates. Check the start date." };
  }

  return {
    data: {
      title: event.title,
      description: event.description,
      locationName: event.locationName,
      address1: event.address1,
      address2: event.address2,
      city: event.city,
      state: event.state,
      zip: event.zip,
      capacity: event.capacity,
      startTime: local.slice(11, 16),
      durationMinutes: event.endsAt ? Math.round((event.endsAt.getTime() - event.startsAt.getTime()) / 60_000) : null,
      frequency: rule.frequency,
      interval: rule.interval,
      weekday: rule.weekday,
      weeksOfMonth: rule.weeksOfMonth.join(","),
      startDate: rule.startDate,
    },
  };
}

function refresh(id?: string) {
  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/account");
  if (id) revalidatePath(`/events/${id}`);
}

/** Where to send someone after saving a series: its next date, or the events list. */
async function nextDateUrl(seriesId: string) {
  const next = await db.event.findFirst({
    where: { seriesId, startsAt: { gte: new Date() }, cancelled: null },
    orderBy: { startsAt: "asc" },
    select: { id: true },
  });
  return next ? `/events/${next.id}` : "/events";
}

export async function createEvent(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const user = await authorize("ORGANIZER");
    const parsed = parseEvent(fd);
    if ("error" in parsed) return { error: parsed.error };
    const repeat = parseRepeat(fd, parsed.data);
    if (repeat && "error" in repeat) return { error: repeat.error };
    const image = await parseImageFields(fd);
    if ("error" in image) return { error: image.error };

    if (repeat) {
      const series = await db.eventSeries.create({ data: { ...repeat.data, ...image.data, createdById: user.id } });
      await syncSeries(series.id);
      refresh();
      redirect(await nextDateUrl(series.id));
    }
    const event = await db.event.create({ data: { ...parsed.data, ...image.data, createdById: user.id } });
    refresh(event.id);
    redirect(`/events/${event.id}`);
  });
}

/** Edits one event. For a date in a series, only that date changes. */
export async function updateEvent(id: string, _: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    await authorize("ORGANIZER");
    const parsed = parseEvent(fd);
    if ("error" in parsed) return { error: parsed.error };
    const event = await db.event.findUnique({ where: { id }, select: { seriesId: true } });
    if (!event) return { error: "That event no longer exists." };
    const image = await parseImageFields(fd);
    if ("error" in image) return { error: image.error };
    await db.event.update({ where: { id }, data: { ...parsed.data, ...image.data, customized: !!event.seriesId } });
    await deleteUnusedImages();
    refresh(id);
    redirect(`/events/${id}`);
  });
}

/** Deletes a one-time event. Dates in a series are cancelled instead (see setCancelled). */
export async function deleteEvent(id: string) {
  await authorize("ORGANIZER");
  const event = await db.event.findUnique({ where: { id }, select: { seriesId: true } });
  if (event?.seriesId) throw new Error("Dates in a repeating series are cancelled, not deleted.");
  await db.event.delete({ where: { id } });
  await deleteUnusedImages();
  refresh();
  redirect("/events");
}

/** Cancel or restore one date of a series. RSVPs are kept so attendees can see it was cancelled. */
export async function setCancelled(id: string, cancelled: boolean) {
  await authorize("ORGANIZER");
  await db.event.update({ where: { id }, data: { cancelled: cancelled ? "ORGANIZER" : null } });
  refresh(id);
}

/** Form-friendly wrapper for restoring a cancelled date. */
export async function restoreDate(id: string, _: FormState, _fd?: FormData): Promise<FormState> {
  return guard(async () => {
    await setCancelled(id, false);
    return {};
  });
}

export async function updateSeries(seriesId: string, _: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    await authorize("ORGANIZER");
    const parsed = parseEvent(fd);
    if ("error" in parsed) return { error: parsed.error };
    const repeat = parseRepeat(fd, parsed.data);
    if (!repeat) return { error: "Please choose how often it repeats." };
    if ("error" in repeat) return { error: repeat.error };
    const image = await parseImageFields(fd);
    if ("error" in image) return { error: image.error };

    await db.eventSeries.update({ where: { id: seriesId }, data: { ...repeat.data, ...image.data, generatedThrough: null } });
    await syncSeries(seriesId);
    await deleteUnusedImages();
    refresh();
    redirect(await nextDateUrl(seriesId));
  });
}

/** Deletes a series and its upcoming dates (with their RSVPs). Past dates stay as history. */
/** Delete one event's image right away. For a date in a series, only that date changes. */
export async function deleteEventImage(id: string) {
  await authorize("ORGANIZER");
  const event = await db.event.findUnique({ where: { id }, select: { seriesId: true } });
  if (!event) return;
  await db.event.update({ where: { id }, data: { imageId: null, customized: !!event.seriesId } });
  await deleteUnusedImages();
  refresh(id);
}

/** Delete a series' image right away, from the series and every date that hasn't been edited on its own. */
export async function deleteSeriesImage(seriesId: string) {
  await authorize("ORGANIZER");
  await db.eventSeries.update({ where: { id: seriesId }, data: { imageId: null } });
  await syncSeries(seriesId);
  await deleteUnusedImages();
  refresh();
}

export async function deleteSeries(seriesId: string) {
  await authorize("ORGANIZER");
  await db.$transaction([
    db.event.deleteMany({ where: { seriesId, startsAt: { gte: new Date() } } }),
    db.eventSeries.delete({ where: { id: seriesId } }),
  ]);
  await deleteUnusedImages();
  refresh();
  redirect("/events");
}

export async function toggleRsvp(eventId: string, _: FormState, _fd?: FormData): Promise<FormState> {
  return guard(async () => {
    const user = await authorize("USER");
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { rsvps: true } } },
    });
    if (!event) return { error: "That event no longer exists." };

    const existing = await db.rsvp.findUnique({ where: { userId_eventId: { userId: user.id, eventId } } });
    if (existing) {
      await db.rsvp.delete({ where: { id: existing.id } });
      refresh(eventId);
      return { success: "You're no longer signed up." };
    }

    if (event.cancelled) return { error: "This date has been cancelled." };
    if ((event.endsAt ?? event.startsAt) < new Date()) return { error: "This event has already happened." };
    if (event.capacity !== null && event._count.rsvps >= event.capacity) return { error: "Sorry, this event is full." };
    await db.rsvp.create({ data: { userId: user.id, eventId } });
    refresh(eventId);
    return { success: "You're signed up! See you there." };
  });
}
