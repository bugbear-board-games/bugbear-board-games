import { ActionForm } from "./ActionForm";
import { ImageField } from "./ImageField";
import { StartEndFields } from "./StartEndFields";
import type { FormState } from "@/lib/forms";
import { WEEK_OPTIONS, WEEKDAYS } from "@/lib/recurrence";
import { toLocalInputValue } from "@/lib/time";
import { DEFAULT_CITY, DEFAULT_STATE } from "@/lib/location";

type EventValues = {
  title: string; description: string;
  locationName: string; address1: string; address2: string | null; city: string; state: string; zip: string;
  startsAt: Date; endsAt: Date | null; capacity: number | null;
  imageId?: string | null; imageBackground?: string;
};

export type RepeatValues = {
  repeat: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  weekday: number;
  weeksOfMonth: number[];
};

/**
 * - "optional": new events; a "Repeats" tick box turns on the schedule fields.
 * - "required": editing a whole series; the schedule fields are always shown.
 * - "hidden": editing a single event or a single date of a series.
 */
type RepeatMode = "optional" | "required" | "hidden";

export function EventForm({ action, event, repeat, repeatMode = "hidden", submitLabel, deleteImage }: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  /** Deletes the saved image immediately (edit pages only). */
  deleteImage?: () => Promise<void>;
  event?: EventValues;
  repeat?: RepeatValues;
  repeatMode?: RepeatMode;
  submitLabel: string;
}) {
  const isSeries = repeatMode === "required";
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
      <fieldset className="address-fields">
        <legend>Where</legend>
        <label>
          Location name
          <input name="locationName" required autoComplete="off" maxLength={120} defaultValue={event?.locationName} placeholder="Venue name" />
        </label>
        <label>
          Address line 1
          <input name="address1" required autoComplete="bb-venue-line1" defaultValue={event?.address1} placeholder="Street address" />
        </label>
        <label>
          Address line 2
          <input name="address2" autoComplete="bb-venue-line2" defaultValue={event?.address2 ?? ""} placeholder="Suite, floor, or room" />
        </label>
        <div className="address-row">
          <label>
            City
            <input name="city" required autoComplete="bb-venue-city" defaultValue={event?.city || DEFAULT_CITY} />
          </label>
          <label>
            State
            <input name="state" required maxLength={2} autoComplete="bb-venue-state" defaultValue={event?.state || DEFAULT_STATE}
              pattern="[A-Za-z]{2}" title="Two-letter state abbreviation, like PA" />
          </label>
          <label>
            ZIP
            <input name="zip" required inputMode="numeric" autoComplete="bb-venue-zip" defaultValue={event?.zip}
              pattern="\d{5}(-\d{4})?" title="5-digit ZIP code" />
          </label>
        </div>
      </fieldset>

      {repeatMode !== "hidden" && (
        <div className="repeat-block">
          {isSeries ? (
            <>
              <input type="hidden" name="repeats" value="on" />
              {/* Checked but disabled, so the CSS that reveals the schedule fields still applies. */}
              <label className="check"><input type="checkbox" checked disabled readOnly /> Repeats</label>
            </>
          ) : (
            <label className="check"><input type="checkbox" name="repeats" defaultChecked={!!repeat} /> Repeats</label>
          )}
          <fieldset className="repeat-fields">
            <legend className="visually-hidden">Repeat schedule</legend>
            <div className="form-row">
              <label>
                How often
                <select name="repeat" defaultValue={repeat?.repeat ?? "WEEKLY"}>
                  <option value="WEEKLY">Every week</option>
                  <option value="BIWEEKLY">Every other week</option>
                  <option value="MONTHLY">Monthly, on certain weeks</option>
                </select>
              </label>
              <label>
                On
                <select name="weekday" defaultValue={repeat?.weekday ?? 3}>
                  {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </label>
            </div>
            <div className="monthly-only">
              <span className="field-label">Which weeks of the month</span>
              <div className="week-picks">
                {WEEK_OPTIONS.map((w) => (
                  <label key={w.value} className="check">
                    <input type="checkbox" name="weeks" value={w.value} defaultChecked={repeat?.weeksOfMonth.includes(w.value)} />
                    {w.label}
                  </label>
                ))}
              </div>
            </div>
            {isSeries && (
              <p className="muted field-hint" style={{ margin: 0 }}>
                Dates you edited on their own keep their changes. Dates dropped from the schedule are removed,
                or marked cancelled if people had RSVPed.
              </p>
            )}
          </fieldset>
        </div>
      )}

      <StartEndFields
        startLabel={isSeries ? "Schedule starts" : "Starts"}
        startDate={toLocalInputValue(event?.startsAt).slice(0, 10)}
        startTime={toLocalInputValue(event?.startsAt).slice(11, 16)}
        endDate={toLocalInputValue(event?.endsAt).slice(0, 10)}
        endTime={toLocalInputValue(event?.endsAt).slice(11, 16)}
      />
      <label>
        Capacity <span className="muted">(leave blank for unlimited)</span>
        <input type="number" name="capacity" min={1} step={1} defaultValue={event?.capacity ?? ""} />
      </label>
      <ImageField
        currentUrl={event?.imageId ? `/images/${event.imageId}` : null}
        currentBackground={event?.imageBackground}
        deleteImage={deleteImage}
      />
    </ActionForm>
  );
}
