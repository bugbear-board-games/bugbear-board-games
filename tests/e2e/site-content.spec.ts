import { expect, test } from "@playwright/test";
import { db, load, newUser, setRole, uniq, openAdmin } from "./helpers";

test("guidelines: one field set per rule, auto-numbered, reorderable, formatting kept", async ({ browser }) => {
  const { page } = await newUser(browser, "ADMIN");
  await openAdmin(page, "guidelines");
  const g = page.locator("section#guidelines");
  await expect(page.locator('textarea[name="guidelines"]')).toHaveCount(0); // no more single text box
  const items = g.locator(".guideline-admin-item");
  const start = await items.count();
  expect(start).toBeGreaterThanOrEqual(1);

  const title = uniq("Have fun");
  await g.locator('div.leader-edit input[name="title"]').fill(title);
  await g.locator('div.leader-edit textarea[name="body"]').fill("Line one.\nLine two.");
  await g.locator('div.leader-edit button:has-text("Add rule")').click();
  await expect(items).toHaveCount(start + 1);
  await expect(items.last().locator(".hex-num")).toHaveText(String(start + 1));
  await expect(items.first().locator('button[aria-label$="up"]')).toBeDisabled();

  if (start >= 1) {
    await items.last().locator('button[aria-label$="up"]').click();
    await expect(items.nth(start - 1).locator("summary")).toHaveText(title);
  }
  await load(page, "/guidelines");
  const rule = page.locator("li.guideline", { hasText: title });
  expect(await rule.locator("p").innerText()).toBe("Line one.\nLine two.");
  await expect(page.locator("li.guideline")).toHaveCount(start + 1);

  await openAdmin(page, "guidelines");
  const mine = g.locator(".guideline-admin-item", { hasText: title });
  await mine.locator("summary").click();
  await mine.locator('button:has-text("Delete rule")').click();
  await mine.locator('button:has-text("Yes, delete")').click();
  await expect(items).toHaveCount(start);
});

test("home page blurb keeps line breaks and spacing", async ({ browser }) => {
  const { page } = await newUser(browser, "ADMIN");
  await openAdmin(page, "content");
  const original = await page.inputValue('textarea[name="mission"]');
  const blurb = "First line\nSecond line right below\n\n    Indented after a blank line";
  try {
    await page.fill('textarea[name="mission"]', blurb);
    await page.click('section#content button:has-text("Save site text")');
    await expect(page.locator("section#content .msg-success")).toBeVisible();
    await load(page, "/");
    expect(await page.locator(".mission").innerText()).toBe(blurb);
  } finally {
    await openAdmin(page, "content");
    await page.fill('textarea[name="mission"]', original);
    await page.click('section#content button:has-text("Save site text")');
    await expect(page.locator("section#content .msg-success")).toBeVisible();
  }
});

test("announcements show only while active", async ({ browser }) => {
  await db.announcement.deleteMany({});
  const { page } = await newUser(browser, "ADMIN");
  await load(page, "/");
  await expect(page.locator(".announcements-section")).toHaveCount(0);

  await openAdmin(page, "announcements");
  const a = page.locator("section#announcements");
  await a.locator('div.leader-edit input[name="title"]').fill("Snow day");
  await a.locator('div.leader-edit textarea[name="body"]').fill("No game night tonight.\nStay warm!");
  await a.locator('div.leader-edit button:has-text("Post announcement")').click();
  await expect(a.locator("div.leader-edit .msg-success")).toBeVisible();

  await load(page, "/");
  await expect(page.locator(".announcement h3")).toHaveText("Snow day");
  expect(await page.locator(".announcement .preserve-format").innerText()).toBe("No game night tonight.\nStay warm!");

  await db.announcement.updateMany({ where: { title: "Snow day" }, data: { showUntil: new Date(Date.now() - 60_000) } });
  await load(page, "/");
  await expect(page.locator(".announcements-section")).toHaveCount(0);
  await openAdmin(page, "announcements");
  await expect(a.locator(".status-off", { hasText: "Ended" })).toBeVisible();
  await db.announcement.deleteMany({});
});

test("social links: only real web links, shown on the home page in order", async ({ browser }) => {
  await db.socialLink.deleteMany({});
  const { page } = await newUser(browser, "ADMIN");
  await openAdmin(page, "social");
  const s = page.locator("section#social");
  const add = async (platform: string, url: string) => {
    await s.locator('div.leader-edit select[name="platform"]').selectOption(platform);
    await s.locator('div.leader-edit input[name="url"]').fill(url);
    await s.locator('div.leader-edit button:has-text("Add link")').click();
  };
  await add("instagram", "javascript:alert(1)");
  await expect(s.locator("div.leader-edit .msg-error")).toBeVisible();
  await add("instagram", "instagram.com/bugbearboardgames");
  await expect(s.locator("div.leader-edit .msg-success")).toBeVisible();
  await add("discord", "https://discord.gg/example");
  await expect(s.locator("details.leader-edit")).toHaveCount(2);

  await load(page, "/");
  const chips = page.locator(".social-links a.social-chip");
  await expect(chips).toHaveCount(2);
  await expect(chips.first()).toContainText("Instagram");
  await expect(chips.first()).toHaveAttribute("href", "https://instagram.com/bugbearboardgames");
  await expect(chips.first()).toHaveAttribute("rel", /noopener/);
  await db.socialLink.deleteMany({});
});

test("contact page lists Organizers and up automatically; Admins set title and public email", async ({ browser }) => {
  const name = uniq("Olive");
  const org = await newUser(browser, "ORGANIZER", name);
  const { page } = await newUser(browser, "ADMIN");
  await load(page, "/contact");
  const card = page.locator(".leader", { hasText: name });
  await expect(card.locator(".role-title")).toHaveText("Organizer");
  await expect(page.locator("main")).not.toContainText(org.email);
  await expect(page.locator('main a[href^="tel:"]')).toHaveCount(0);

  await openAdmin(page, "leadership");
  const edit = page.locator("section#leadership details", { hasText: name });
  await edit.locator("summary").click();
  await edit.locator('input[name="displayTitle"]').fill("Events Lead");
  await edit.locator('input[name="publicEmail"]').fill("olive@bugbearboardgames.com");
  await edit.locator('button:has-text("Save card")').click();
  await expect(edit.locator(".msg-success")).toBeVisible();

  await load(page, "/contact");
  await expect(card.locator(".role-title")).toHaveText("Events Lead");
  await expect(card.locator("a")).toHaveAttribute("href", "mailto:olive@bugbearboardgames.com");
  await setRole(org.email, "USER");
  await load(page, "/contact");
  await expect(card).toHaveCount(0);
});

test("mobile header hides scrolling down and returns scrolling up; desktop stays pinned", async ({ browser }) => {
  const mobile = await (await browser.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true })).newPage();
  await mobile.goto("/guidelines");
  const top = () => mobile.locator(".site-header").evaluate((h) => Math.round(h.getBoundingClientRect().top));
  expect(await top()).toBe(0);
  await mobile.mouse.wheel(0, 900);
  await expect.poll(top).toBeLessThan(-40);
  await mobile.mouse.wheel(0, -150);
  await expect.poll(top).toBe(0);

  const desk = await (await browser.newContext({ viewport: { width: 1200, height: 700 } })).newPage();
  await desk.goto("/guidelines");
  await desk.mouse.wheel(0, 900);
  await desk.waitForTimeout(500);
  expect(await desk.locator(".site-header").evaluate((h) => Math.round(h.getBoundingClientRect().top))).toBe(0);
});
