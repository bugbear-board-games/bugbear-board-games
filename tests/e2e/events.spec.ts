import { expect, test } from "@playwright/test";
import { daysFromToday, fillEventBasics, firstOccurrence, load, newUser, prettyDate, submit, uniq } from "./helpers";

test.describe("event form", () => {
  test("repeat options appear only when Repeats is ticked; end date hides for repeating events", async ({ browser }) => {
    const { page } = await newUser(browser, "ORGANIZER");
    await load(page, "/events/new");
    await expect(page.locator('select[name="weekday"]')).toBeHidden();
    await expect(page.locator('input[name="endDate"]')).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Pittsburgh time");

    await page.check('.repeat-block input[name="repeats"]');
    await expect(page.locator('select[name="weekday"]')).toBeVisible();
    await expect(page.locator('input[name="weeks"]').first()).toBeHidden();
    await expect(page.locator('input[name="endDate"]')).toBeHidden();
    await expect(page.locator('input[name="endTime"]')).toBeVisible();
    await page.selectOption('select[name="repeat"]', "MONTHLY");
    await expect(page.locator('input[name="weeks"]').first()).toBeVisible();
    await expect(page.locator('input[name="repeatUntil"]')).toHaveCount(0);
  });

  test("end date follows the start date until changed by hand", async ({ browser }) => {
    const { page } = await newUser(browser, "ORGANIZER");
    await load(page, "/events/new");
    const d1 = daysFromToday(20), d2 = daysFromToday(21), d3 = daysFromToday(25);
    await page.fill('input[name="startDate"]', d1);
    await expect(page.locator('input[name="endDate"]')).toHaveValue(d1);
    await page.fill('input[name="endDate"]', d2);
    await page.fill('input[name="startDate"]', d3);
    await expect(page.locator('input[name="endDate"]')).toHaveValue(d2);
  });

  test("one-time event: end time required, past-midnight needs next day, address shown with map link", async ({ browser }) => {
    const { page } = await newUser(browser, "ORGANIZER");
    await load(page, "/events/new");
    const day = daysFromToday(30);
    await fillEventBasics(page, uniq("Late Night"), day, "21:00", "01:00");
    await page.fill('input[name="address2"]', "Back room");
    await submit(page);
    await expect(page.locator(".msg-error")).toContainText("past midnight");
    await page.fill('input[name="endDate"]', daysFromToday(31));
    await submit(page);
    await page.waitForURL(/\/events\/c[a-z0-9]+$/);
    await expect(page.locator("article")).toContainText("9:00 PM – 1:00 AM");
    const where = page.locator(".event-address");
    await expect(where).toContainText("Test Venue");
    await expect(where).toContainText("Back room");
    await expect(where).toContainText("Pittsburgh, PA 15222");
    await expect(where.locator("a")).toHaveAttribute("href", /google\.com\/maps\/search\/\?api=1&query=Test%20Venue/);
  });
});

test.describe.serial("repeating series lifecycle", () => {
  const title = uniq("Wednesday Game Night");
  const rule13 = { frequency: "MONTHLY" as const, interval: 1, weekday: 3, weeksOfMonth: [1, 3], startDate: daysFromToday(1) };
  let firstUrl = "";

  test("monthly first & third Wednesday: requires a week, lands on the first date", async ({ browser }) => {
    const { page } = await newUser(browser, "ORGANIZER");
    await load(page, "/events/new");
    await fillEventBasics(page, title, rule13.startDate, "19:00", "22:30");
    await page.check('.repeat-block input[name="repeats"]');
    await page.selectOption('select[name="repeat"]', "MONTHLY");
    await page.selectOption('select[name="weekday"]', "3");
    await submit(page);
    await expect(page.locator(".msg-error")).toContainText("week of the month");
    await page.check('input[name="weeks"][value="1"]');
    await page.check('input[name="weeks"][value="3"]');
    await submit(page);
    await page.waitForURL(/\/events\/c[a-z0-9]+$/);
    firstUrl = page.url();
    const article = page.locator("article");
    await expect(article).toContainText(prettyDate(firstOccurrence(rule13)));
    await expect(article).toContainText("7:00 PM – 10:30 PM");
    await expect(article).toContainText("Every first and third Wednesday");

    // Cancel and restore one date
    await page.click("text=Cancel this date");
    await page.click("text=Yes, cancel it");
    await expect(page.locator("text=This date has been cancelled.")).toBeVisible();
    await expect(page.locator("text=I'm going!")).toHaveCount(0);
    await page.click('button:has-text("Restore this date")');
    await expect(page.locator("text=I'm going!")).toBeVisible();

    // Edit the series: switch to second & fourth
    await page.click("text=Edit series");
    await page.waitForURL("**/series/**/edit");
    await expect(page.locator('.repeat-block > label.check input')).toBeDisabled();
    await expect(page.locator('input[name="weeks"][value="1"]')).toBeChecked();
    await expect(page.locator('input[name="endTime"]')).toHaveValue("22:30");
    await page.uncheck('input[name="weeks"][value="1"]');
    await page.uncheck('input[name="weeks"][value="3"]');
    await page.check('input[name="weeks"][value="2"]');
    await page.check('input[name="weeks"][value="4"]');
    await submit(page);
    await page.waitForURL(/\/events\/c[a-z0-9]+$/);
    await expect(page.locator("article")).toContainText(prettyDate(firstOccurrence({ ...rule13, weeksOfMonth: [2, 4] })));
    await expect(page.locator("article")).toContainText("Every second and fourth Wednesday");
    expect((await page.goto(firstUrl))!.status()).toBe(404); // old date had no RSVPs, so it's removed

    // Regular events accordion: collapsed by default, lists the series
    await load(page, "/events");
    const acc = page.locator("details.series-accordion");
    await expect(acc).not.toHaveAttribute("open", "");
    await acc.locator("summary").click();
    const item = acc.locator(".series-item", { hasText: title });
    await expect(item).toBeVisible();

    // Delete the series
    await item.locator("a").click();
    await page.click("text=Delete series");
    await page.click("text=Yes, delete all upcoming dates");
    await page.waitForURL("**/events");
    await expect(page.locator("main")).not.toContainText(title);
  });

  test("repeating event past midnight ends the next day without an end date", async ({ browser }) => {
    const { page } = await newUser(browser, "ORGANIZER");
    await load(page, "/events/new");
    const t = uniq("Late Series");
    await fillEventBasics(page, t, daysFromToday(2), "21:00", "01:00");
    await page.check('.repeat-block input[name="repeats"]');
    await page.selectOption('select[name="weekday"]', "5");
    await submit(page);
    await page.waitForURL(/\/events\/c[a-z0-9]+$/);
    await expect(page.locator("article")).toContainText("9:00 PM – 1:00 AM");
    await page.click("text=Delete series");
    await page.click("text=Yes, delete all upcoming dates");
    await page.waitForURL("**/events");
  });
});
