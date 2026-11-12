import { expect, test } from "@playwright/test";
import { OWNER_TEST_PASSWORD } from "./global-setup";
import { load, newUser, openAdmin, signIn } from "./helpers";

const TABS = ["content", "announcements", "social", "guidelines", "leadership", "members", "bans"];

test("admin bubbles are tabs: one module at a time, URL-addressable, keyboard-friendly", async ({ browser }) => {
  const { page } = await newUser(browser, "ADMIN");
  await load(page, "/admin");

  // Starts on Site text; every other module is hidden.
  await expect(page.getByRole("tab", { name: "Site text" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("section#content")).toBeVisible();
  for (const id of TABS.slice(1)) await expect(page.locator(`section#${id}`)).toBeHidden();
  await expect(page.getByRole("tab")).toHaveCount(TABS.length); // no Ownership tab for Admins

  // Clicking a bubble switches modules and updates the address bar.
  await page.getByRole("tab", { name: "Guidelines" }).click();
  await expect(page.locator("section#guidelines")).toBeVisible();
  await expect(page.locator("section#content")).toBeHidden();
  await expect(page).toHaveURL(/#guidelines$/);

  // Arrow keys move between tabs.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Leadership" })).toBeFocused();
  await expect(page.locator("section#leadership")).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page.locator("section#content")).toBeVisible();

  // Back button returns to the previous tab.
  await page.goBack();
  await expect(page.locator("section#leadership")).toBeVisible();

  // Unsaved typing survives switching tabs.
  await page.getByRole("tab", { name: "Announcements" }).click();
  await page.locator('section#announcements div.leader-edit input[name="title"]').fill("Half-typed draft");
  await page.getByRole("tab", { name: "Bans" }).click();
  await page.getByRole("tab", { name: "Announcements" }).click();
  await expect(page.locator('section#announcements div.leader-edit input[name="title"]')).toHaveValue("Half-typed draft");
});

test("deep links and Edit links open the matching tab", async ({ browser }) => {
  const { page } = await newUser(browser, "ADMIN");
  await openAdmin(page, "bans");
  await expect(page.locator("section#bans")).toBeVisible();
  await expect(page.locator("section#content")).toBeHidden();

  await load(page, "/guidelines");
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/admin#guidelines$/);
  await expect(page.locator("section#guidelines")).toBeVisible();
});

test("only the Owner sees the Ownership tab", async ({ page }) => {
  await signIn(page, process.env.E2E_OWNER_EMAIL!, OWNER_TEST_PASSWORD);
  await load(page, "/admin");
  await page.getByRole("tab", { name: "Ownership" }).click();
  await expect(page.locator("section#ownership")).toBeVisible();
});
