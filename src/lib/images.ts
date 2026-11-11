import "server-only";
import { db } from "./db";
import { field } from "./forms";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_BACKGROUNDS = ["TRANSPARENT", "LIGHT", "DARK"] as const;
export type ImageBackground = (typeof IMAGE_BACKGROUNDS)[number];

/** Identify the image type from its first bytes (never trust the browser's label). SVG is not allowed. */
function sniffType(b: Uint8Array): string | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/**
 * Reads the image fields of an event form.
 * - image: a new file (optional)
 * - imageBackground: TRANSPARENT | LIGHT | DARK
 * Returns the Prisma fields to save (imageId is only included when it changes).
 */
export async function parseImageFields(fd: FormData): Promise<
  { error: string } | { data: { imageBackground: ImageBackground; imageId?: string | null } }
> {
  const bg = field(fd, "imageBackground");
  const imageBackground: ImageBackground = (IMAGE_BACKGROUNDS as readonly string[]).includes(bg)
    ? (bg as ImageBackground)
    : "TRANSPARENT";

  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) return { error: "Images must be 4 MB or smaller." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = sniffType(bytes);
    if (!mimeType) return { error: "Please upload a PNG, JPEG, WebP, or GIF image." };
    const image = await db.image.create({ data: { data: bytes, mimeType, size: bytes.length } });
    return { data: { imageBackground, imageId: image.id } };
  }
  return { data: { imageBackground } };
}

/** Delete images no event or series uses any more (after a replace or remove). */
export async function deleteUnusedImages(): Promise<void> {
  await db.image.deleteMany({ where: { events: { none: {} }, series: { none: {} } } });
}
