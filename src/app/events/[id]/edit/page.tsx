import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { updateEvent } from "@/actions/events";
import { EventForm } from "@/components/EventForm";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ORGANIZER");
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <div className="container page narrow">
      <Link href={`/events/${event.id}`} className="back-link">← Back to event</Link>
      <div className="panel">
        <h1>Edit event</h1>
        <EventForm action={updateEvent.bind(null, event.id)} event={event} submitLabel="Save changes" />
      </div>
    </div>
  );
}
