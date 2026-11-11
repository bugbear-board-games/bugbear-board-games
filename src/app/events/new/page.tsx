import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createEvent } from "@/actions/events";
import { EventForm } from "@/components/EventForm";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  await requireRole("ORGANIZER");
  return (
    <div className="container page narrow">
      <Link href="/events" className="back-link">← All events</Link>
      <div className="panel">
        <h1>New event</h1>
        <EventForm action={createEvent} repeatMode="optional" submitLabel="Publish event" />
      </div>
    </div>
  );
}
