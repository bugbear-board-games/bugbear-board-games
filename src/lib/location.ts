import { field } from "./forms";

// Structured event location, so every event lists its venue the same way.
export type EventLocation = {
  locationName: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
};

export const DEFAULT_CITY = "Pittsburgh";
export const DEFAULT_STATE = "PA";

export function parseLocation(fd: FormData): { error: string } | { data: EventLocation } {
  const locationName = field(fd, "locationName");
  const address1 = field(fd, "address1");
  const address2 = field(fd, "address2") || null;
  const city = field(fd, "city");
  const state = field(fd, "state").toUpperCase();
  const zip = field(fd, "zip");

  if (!locationName || locationName.length > 120) return { error: "Please add a location name (up to 120 characters)." };
  if (!address1) return { error: "Please add the street address (Address line 1)." };
  if (!city) return { error: "Please add the city." };
  if (!/^[A-Z]{2}$/.test(state)) return { error: "State should be a two-letter abbreviation, like PA." };
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return { error: "ZIP code should be 5 digits (or ZIP+4, like 12345-6789)." };
  return { data: { locationName, address1, address2, city, state, zip } };
}

/** Address as display lines, e.g. ["1931 Smallman St", "Pittsburgh, PA 15222"]. */
export function addressLines(l: EventLocation): string[] {
  const cityLine = [l.city, [l.state, l.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [l.address1, l.address2, cityLine].filter((s): s is string => !!s);
}

/** Google Maps search link for the venue. */
export function mapsUrl(l: EventLocation): string {
  const query = [l.locationName, ...addressLines(l)].join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Prisma `select` fragment for the location fields. */
export const locationSelect = {
  locationName: true, address1: true, address2: true, city: true, state: true, zip: true,
} as const;
