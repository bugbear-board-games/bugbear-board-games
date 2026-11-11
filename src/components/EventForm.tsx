import { ActionForm } from "./ActionForm";
import type { FormState } from "@/lib/forms";
import { toLocalInputValue } from "@/lib/time";

type EventValues = {
  title: string; description: string; location: string;
  startsAt: Date; endsAt: Date | null; capacity: number | null;
};

export function EventForm({ action, event, submitLabel }: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  event?: EventValues;
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel}>
      <label>
        Title
        <input name="title" required maxLength={120} defaultValue={event?.title} placeholder="Friday Night Games" />
      </label>
      <label>
        Description
        <textarea name="description" required rows={6} defaultValue={event?.description}
          placeholder="What are we playing? Who is it for? Anything to bring?" />
      </label>
      <label>
        Location
        <input name="location" required defaultValue={event?.location} placeholder="Venue name and address" />
      </label>
      <div className="form-row">
        <label>
          Starts <span className="muted">(Pittsburgh time)</span>
          <input type="datetime-local" name="startsAt" required defaultValue={toLocalInputValue(event?.startsAt)} />
        </label>
        <label>
          Ends <span className="muted">(optional)</span>
          <input type="datetime-local" name="endsAt" defaultValue={toLocalInputValue(event?.endsAt)} />
        </label>
      </div>
      <label>
        Capacity <span className="muted">(leave blank for unlimited)</span>
        <input type="number" name="capacity" min={1} step={1} defaultValue={event?.capacity ?? ""} />
      </label>
    </ActionForm>
  );
}
