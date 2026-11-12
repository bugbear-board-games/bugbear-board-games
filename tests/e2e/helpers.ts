import { expect, type Browser, type Page } from "@playwright/test";
import { createPrismaClient } from "../../src/lib/prismaClient";
import { addDays, occurrences, type RepeatRule } from "../../src/lib/recurrence";
import { formatEventDate, parseLocalDateTime, todayLocal } from "../../src/lib/time";

if (process.env.NEON_BRANCH !== "test") throw new Error("e2e helpers only run against the Neon test branch.");

/** Direct database access for setup (e.g. promoting a test user). Test branch only. */
export const db = createPrismaClient();

export const PASSWORD = "password123";
export const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
export const emailFor = (prefix: string) => `${uniq(prefix)}@example.com`;
export const LOGO = "public/logo.png";

/** Register through the real sign-up form; leaves the page signed in. */
export async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirm"]', PASSWORD);
  await page.click('main button[type="submit"]');
  await page.waitForURL("**/events");
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('main button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function setRole(email: string, role: "USER" | "ORGANIZER" | "ADMIN") {
  await db.user.update({ where: { email }, data: { role } });
}

/** A fresh browser context signed in as a new user with the given role. */
export async function newUser(browser: Browser, role: "USER" | "ORGANIZER" | "ADMIN", name = "Test User") {
  const page = await (await browser.newContext()).newPage();
  const email = emailFor(role.toLowerCase());
  await register(page, name, email);
  if (role !== "USER") await setRole(email, role);
  return { page, email, name };
}

/** Load a page fully (avoids same-URL hash navigations that don't reload). */
export async function load(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** Click a form's submit button (not the header's "Sign out"). */
export const submit = (page: Page) => page.click('main button[type="submit"]');

// ---- Dates relative to today, so tests never go stale ----

export const daysFromToday = (n: number) => addDays(todayLocal(), n);
export const prettyDate = (ymd: string) => formatEventDate(parseLocalDateTime(`${ymd}T12:00`)!);

/** First date a rule produces on/after `from` (uses the site's own schedule logic). */
export function firstOccurrence(rule: Omit<RepeatRule, "endDate">, from = todayLocal(), skip = 0) {
  return occurrences({ ...rule, endDate: null }, from, addDays(from, 400))[skip];
}

/** Fill the address block of the event form. */
export async function fillWhere(page: Page, name = "Test Venue") {
  await page.fill('input[name="locationName"]', name);
  await page.fill('input[name="address1"]', "1931 Smallman St");
  await page.fill('input[name="zip"]', "15222");
}

/** Fill the required basics of the New event form. */
export async function fillEventBasics(page: Page, title: string, date: string, start = "19:00", end = "22:00") {
  await page.fill('input[name="title"]', title);
  await page.fill('textarea[name="description"]', "Bring a game!");
  await fillWhere(page);
  await page.fill('input[name="startDate"]', date);
  await page.fill('input[name="startTime"]', start);
  await page.fill('input[name="endTime"]', end);
}

export async function expectNoFormError(page: Page) {
  await expect(page.locator("main .msg-error")).toHaveCount(0);
}
