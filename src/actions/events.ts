"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { field, guard, type FormState } from "@/lib/forms";
import { parseLocalDateTime } from "@/lib/time";

function parseEvent(fd: FormData) {
  const title = field(fd, "title");
  const description = field(fd, "description");
  const location = field(fd, "location");
  const startsAt = parseLocalDateTime(field(fd, "startsAt"));
  const endsRaw = field(fd, "endsAt");
  const endsAt = endsRaw ? parseLocalDateTime(endsRaw) : null;
  const capRaw = field(fd, "capacity");
  const capacity = capRaw ? Number(capRaw) : null;

  if (!title || title.length > 120) return { error: "Title is required (up to 120 characters)." };
  if (!description) return { error: "Please add a description." };
  if (!location) return { error: "Please add a location." };
  if (!startsAt) return { error: "Please choose a valid start time." };
  if (endsRaw && !endsAt) return { error: "End time is invalid." };
  if (endsAt && endsAt <= startsAt) return { error: "End time must be after the start time." };
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
    return { error: "Capacity must be a whole number of at least 1, or left blank." };
  }
  return { data: { title, description, location, startsAt, endsAt, capacity } };
}

function refresh(id?: string) {
  revalidatePath("/");
  revalidatePath("/events");
  if (id) revalidatePath(`/events/${id}`);
}

export async function createEvent(_: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    const user = await authorize("ORGANIZER");
    const parsed = parseEvent(fd);
    if ("error" in parsed) return { error: parsed.error };
    const event = await db.event.create({ data: { ...parsed.data, createdById: user.id } });
    refresh(event.id);
    redirect(`/events/${event.id}`);
  });
}

export async function updateEvent(id: string, _: FormState, fd: FormData): Promise<FormState> {
  return guard(async () => {
    await authorize("ORGANIZER");
    const parsed = parseEvent(fd);
    if ("error" in parsed) return { error: parsed.error };
    await db.event.update({ where: { id }, data: parsed.data });
    refresh(id);
    redirect(`/events/${id}`);
  });
}

export async function deleteEvent(id: string) {
  await authorize("ORGANIZER");
  await db.event.delete({ where: { id } });
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

    if ((event.endsAt ?? event.startsAt) < new Date()) return { error: "This event has already happened." };
    if (event.capacity !== null && event._count.rsvps >= event.capacity) return { error: "Sorry, this event is full." };
    await db.rsvp.create({ data: { userId: user.id, eventId } });
    refresh(eventId);
    return { success: "You're signed up! See you there." };
  });
}
