import { expect, test } from "@playwright/test";
import { OWNER_TEST_PASSWORD } from "./global-setup";
import { db, emailFor, load, newUser, PASSWORD, register, signIn, openAdmin } from "./helpers";

test.describe("required-field notices", () => {
  test("sign-up flags each empty field, clears as it's filled, and checks email format", async ({ page }) => {
    await page.goto("/register");
    await page.click('main button[type="submit"]');
    const flags = page.locator("label.is-invalid");
    await expect(flags).toHaveCount(4);
    await expect(flags.first()).toHaveAttribute("data-invalid-msg", "Required");

    await page.fill('input[name="name"]', "Rex");
    await page.fill('input[name="email"]', "not-an-email");
    await page.click('main button[type="submit"]');
    await expect(page.locator('label:has(input[name="email"])')).toHaveAttribute("data-invalid-msg", "Enter a valid email");
    await expect(page.locator('label.is-invalid:has(input[name="name"])')).toHaveCount(0);
  });

  test("new event flags exactly the required fields and scrolls to the first", async ({ browser }) => {
    const { page } = await newUser(browser, "ORGANIZER");
    await load(page, "/events/new");
    await page.click('main button[type="submit"]');
    await expect(page.locator(".is-invalid").first()).toBeVisible();
    const flagged = await page.$$eval(".is-invalid", (els) =>
      els.map((e) => ((e.querySelector(".field-label")?.textContent || e.firstChild?.textContent || "").trim())));
    expect(flagged).toEqual(["Title", "Description", "Location name", "Address line 1", "ZIP", "Starts", "Ends"]);
    await page.waitForTimeout(800); // smooth scroll
    const top = await page.locator('input[name="title"]').evaluate((e) => e.getBoundingClientRect().top);
    expect(top).toBeGreaterThan(80); // not hidden under the sticky header
  });
});

test("admin can give a locked-out member a temporary password", async ({ browser }) => {
  const member = await newUser(browser, "USER", "Mo Member");
  const { page: admin } = await newUser(browser, "ADMIN", "Ada Admin");
  await openAdmin(admin, "members");
  const row = admin.locator("tr", { hasText: member.email });
  await row.locator("summary", { hasText: "Reset" }).click();
  await row.locator('button:has-text("Generate temporary password")').click();
  const msg = await row.locator(".msg-success").textContent();
  const temp = msg?.match(/[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}/)?.[0];
  expect(temp).toBeTruthy();

  // Member is signed out everywhere; old password fails, temporary one works, then they change it.
  await member.page.goto("/account");
  await expect(member.page).toHaveURL(/\/login/);
  await member.page.fill('input[name="email"]', member.email);
  await member.page.fill('input[name="password"]', PASSWORD);
  await member.page.click('main button[type="submit"]');
  await expect(member.page.locator(".msg-error")).toBeVisible();
  await signIn(member.page, member.email, temp!);
  await member.page.goto("/account");
  await member.page.fill('input[name="current"]', temp!);
  await member.page.fill('input[name="password"]', "newpassword456");
  await member.page.fill('input[name="confirm"]', "newpassword456");
  await member.page.click('form:has(input[name="current"]) button[type="submit"]');
  await expect(member.page.locator(".msg-success")).toContainText("Password changed");
});

test("admins can't reset other admins or themselves", async ({ browser }) => {
  const other = await newUser(browser, "ADMIN", "Other Admin");
  const { page, email } = await newUser(browser, "ADMIN", "Self Admin");
  await openAdmin(page, "members");
  await expect(page.locator("tr", { hasText: other.email }).locator("summary")).toHaveCount(0);
  await expect(page.locator("tr", { hasText: email }).locator("summary")).toHaveCount(0);
});

test.describe("transfer ownership", () => {
  test("fields can't be autofilled and only accept deliberate input", async ({ page }) => {
    await signIn(page, process.env.E2E_OWNER_EMAIL!, OWNER_TEST_PASSWORD);
    await openAdmin(page, "ownership");
    const section = page.locator("#ownership");
    await expect(section.locator("form")).toHaveAttribute("autocomplete", "off");
    const inputs = section.locator("input");
    await expect(inputs).toHaveCount(3);
    for (const input of await inputs.all()) {
      await expect(input).toHaveValue("");
      await expect(input).toHaveAttribute("readonly", ""); // locked until focused
      await expect(input).toHaveAttribute("data-1p-ignore", "true");
      await expect(input).toHaveAttribute("data-lpignore", "true");
    }
    // Not shaped like a sign-in form: no "email"/"password" names, no current-password hint.
    await expect(section.locator('input[name="email"], input[name="password"]')).toHaveCount(0);
    await expect(section.locator('input[type="password"]')).toHaveAttribute("autocomplete", "new-password");
    await expect(section.locator('input[name="newOwnerEmail"]')).toHaveAttribute("autocomplete", "off");
    await section.locator('input[name="newOwnerEmail"]').click();
    await expect(section.locator('input[name="newOwnerEmail"]')).not.toHaveAttribute("readonly", "");
  });

  test("owner can hand ownership over and get it back", async ({ browser, page }) => {
    const ownerEmail = process.env.E2E_OWNER_EMAIL!;
    const next = await newUser(browser, "ADMIN", "Next Owner");
    await signIn(page, ownerEmail, OWNER_TEST_PASSWORD);
    await openAdmin(page, "ownership");
    const s = page.locator("#ownership");
    await s.locator('input[name="newOwnerEmail"]').click();
    await s.locator('input[name="newOwnerEmail"]').fill(next.email);
    await s.locator('input[name="ownerPassword"]').click();
    await s.locator('input[name="ownerPassword"]').fill(OWNER_TEST_PASSWORD);
    await s.locator('input[name="transferConfirm"]').click();
    await s.locator('input[name="transferConfirm"]').fill("TRANSFER");
    await s.locator('button:has-text("Transfer ownership")').click();
    await expect(page.locator(".msg-success", { hasText: "Ownership transferred" })).toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { email: next.email } })).role).toBe("OWNER");

    // Give it back so other tests keep a known Owner.
    await openAdmin(next.page, "ownership");
    const s2 = next.page.locator("#ownership");
    await s2.locator('input[name="newOwnerEmail"]').click();
    await s2.locator('input[name="newOwnerEmail"]').fill(ownerEmail);
    await s2.locator('input[name="ownerPassword"]').click();
    await s2.locator('input[name="ownerPassword"]').fill(PASSWORD);
    await s2.locator('input[name="transferConfirm"]').click();
    await s2.locator('input[name="transferConfirm"]').fill("TRANSFER");
    await s2.locator('button:has-text("Transfer ownership")').click();
    await expect(next.page.locator(".msg-success", { hasText: "Ownership transferred" })).toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { email: ownerEmail } })).role).toBe("OWNER");
  });
});

test("banned email can't sign in or sign up", async ({ browser, page }) => {
  const victim = emailFor("banned");
  await register(page, "Soon Banned", victim);
  const { page: admin } = await newUser(browser, "ADMIN");
  await openAdmin(admin, "bans");
  const bans = admin.locator("#bans");
  await bans.locator('input[name="email"]').fill(victim);
  await bans.locator('button:has-text("Ban email")').click();
  await expect(bans.locator(".msg-success")).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/); // signed out
  await page.fill('input[name="email"]', victim);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('main button[type="submit"]');
  await expect(page.locator(".msg-error")).toContainText("banned");
});
