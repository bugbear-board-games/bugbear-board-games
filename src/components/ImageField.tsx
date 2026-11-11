"use client";

import { useEffect, useState } from "react";
import { ConfirmButton } from "./ConfirmButton";

const BACKGROUNDS = [
  { value: "TRANSPARENT", label: "Transparent", hint: "No backing; best for photos" },
  { value: "LIGHT", label: "Light", hint: "For dark logos and line art" },
  { value: "DARK", label: "Dark", hint: "For light or white artwork" },
] as const;

/** Image upload with a live preview on the chosen background. */
export function ImageField({ currentUrl, currentBackground = "TRANSPARENT", deleteImage }: {
  currentUrl?: string | null;
  currentBackground?: string;
  /** Deletes the saved image right away; shown as a button with an inline confirmation. */
  deleteImage?: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [background, setBackground] = useState(currentBackground);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const savedUrl = deleted ? null : currentUrl ?? null;
  const shown = preview ?? savedUrl;

  return (
    <fieldset className="image-field">
      <legend>Image <span className="muted">(PNG, JPEG, WebP or GIF, up to 4 MB)</span></legend>
      <input
        type="file"
        name="image"
        accept="image/png,image/jpeg,image/webp,image/gif"
        aria-label="Event image"
        onChange={(e) => {
          const file = e.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />

      <div className="bg-options" role="radiogroup" aria-label="Image background">
        {BACKGROUNDS.map((b) => (
          <label key={b.value} className={`bg-option${background === b.value ? " is-selected" : ""}`}>
            <input type="radio" name="imageBackground" value={b.value}
              checked={background === b.value} onChange={() => setBackground(b.value)} />
            <span className={`bg-swatch img-bg-${b.value}`} aria-hidden="true" />
            <span><strong>{b.label}</strong><span className="muted">{b.hint}</span></span>
          </label>
        ))}
      </div>

      {shown ? (
        <div className={`event-image img-bg-${background}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="Preview" />
        </div>
      ) : (
        <p className="muted image-empty">{deleted ? "Image deleted." : "No image. Choose a file to see a preview."}</p>
      )}

      {savedUrl && !preview && deleteImage && (
        <div>
          <ConfirmButton
            label="Delete image"
            confirmLabel="Yes, delete image"
            action={async () => {
              await deleteImage();
              setDeleted(true);
            }}
          />
        </div>
      )}
    </fieldset>
  );
}
