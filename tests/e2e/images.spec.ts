import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { daysFromToday, db, fillEventBasics, load, LOGO, newUser, submit, uniq } from "./helpers";

const bg = (value: string) => `label.bg-option:has(input[value="${value}"])`;

test("event image: type check, backgrounds, thumbnail fit, delete with confirmation", async ({ browser }) => {
  const { page } = await newUser(browser, "ORGANIZER");
  const before = await db.image.count();
  await load(page, "/events/new");
  await fillEventBasics(page, uniq("Logo Night"), daysFromToday(10));

  // A text file renamed .png is rejected and not stored
  const fake = join(tmpdir(), "not-an-image.png");
  writeFileSync(fake, "not an image");
  await page.setInputFiles('input[name="image"]', fake);
  await submit(page);
  await expect(page.locator(".msg-error")).toContainText("PNG, JPEG");
  expect(await db.image.count()).toBe(before);

  // Real image on a light background, with live preview
  await expect(page.locator('input[name="imageBackground"][value="TRANSPARENT"]')).toBeChecked();
  await page.setInputFiles('input[name="image"]', LOGO);
  await page.click(bg("LIGHT"));
  await expect(page.locator(".image-field .event-image.img-bg-LIGHT img")).toBeVisible();
  await submit(page);
  await page.waitForURL(/\/events\/c[a-z0-9]+$/);
  const eventUrl = page.url();
  const hero = page.locator(".event-image-hero");
  await expect(hero).toHaveClass(/img-bg-LIGHT/);
  const src = await hero.locator("img").getAttribute("src");
  const res = await page.request.get(src!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expect(res.headers()["cache-control"]).toContain("immutable");

  // Change only the background
  await page.click("text=Edit event");
  await page.waitForURL("**/edit");
  await expect(page.locator('input[name="imageBackground"][value="LIGHT"]')).toBeChecked();
  await page.click(bg("DARK"));
  await submit(page);
  await page.waitForURL(eventUrl);
  await expect(page.locator(".event-image-hero")).toHaveClass(/img-bg-DARK/);
  expect(await page.locator(".event-image-hero img").getAttribute("src")).toBe(src);

  // Thumbnail shows the whole image, proportions kept
  await load(page, "/events");
  const thumb = page.locator(".event-card", { has: page.locator(`img[src="${src}"]`) }).locator(".event-thumb");
  await thumb.scrollIntoViewIfNeeded();
  await thumb.locator("img").evaluate((img: HTMLImageElement) =>
    img.complete && img.naturalWidth ? null : new Promise((r) => img.addEventListener("load", r, { once: true })));
  const fit = await thumb.evaluate((box) => {
    const img = box.querySelector("img")!;
    const b = box.getBoundingClientRect(), i = img.getBoundingClientRect();
    return {
      inside: i.left >= b.left - 0.5 && i.right <= b.right + 0.5 && i.top >= b.top - 0.5 && i.bottom <= b.bottom + 0.5,
      ratioDiff: Math.abs(i.width / i.height - img.naturalWidth / img.naturalHeight),
    };
  });
  expect(fit.inside).toBe(true);
  expect(fit.ratioDiff).toBeLessThan(0.03);

  // Delete image: asks first, cancel keeps it, confirm deletes immediately
  await load(page, eventUrl + "/edit");
  await page.click('button:has-text("Delete image")');
  await page.click('.image-field button:has-text("Cancel")');
  await expect(page.locator(".image-field .event-image img")).toBeVisible();
  expect(await db.image.count()).toBe(before + 1);
  await page.click('button:has-text("Delete image")');
  await page.click('button:has-text("Yes, delete image")');
  await expect(page.locator("text=Image deleted.")).toBeVisible();
  expect(await db.image.count()).toBe(before);
  await load(page, eventUrl);
  await expect(page.locator(".event-image-hero")).toHaveCount(0);
});

test("series image is copied to every date and cleaned up when the series is deleted", async ({ browser }) => {
  const { page } = await newUser(browser, "ORGANIZER");
  const before = await db.image.count();
  const title = uniq("Pictured Series");
  await load(page, "/events/new");
  await fillEventBasics(page, title, daysFromToday(1));
  await page.check('.repeat-block input[name="repeats"]');
  await page.selectOption('select[name="weekday"]', "4");
  await page.setInputFiles('input[name="image"]', LOGO);
  await page.click(bg("DARK"));
  await submit(page);
  await page.waitForURL(/\/events\/c[a-z0-9]+$/);
  const dates = await db.event.findMany({ where: { series: { title } }, select: { imageId: true, imageBackground: true } });
  expect(dates.length).toBeGreaterThan(3);
  expect(dates.every((d) => d.imageId && d.imageBackground === "DARK")).toBe(true);
  await page.click("text=Delete series");
  await page.click("text=Yes, delete all upcoming dates");
  await page.waitForURL("**/events");
  expect(await db.image.count()).toBe(before);
});
