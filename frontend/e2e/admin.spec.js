import { expect, test } from "@playwright/test";

const errors = [];

test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => localStorage.clear());
});

test.afterEach(() => {
  expect(errors, errors.join("\n")).toEqual([]);
});

test("built-in admin manages eligible local accounts while protected accounts remain safe", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Public navigation" })
    .getByRole("link", { name: "Login", exact: true })
    .click();
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  await expect(page.getByText("Pending decision")).toBeVisible();
  await expect(page.getByRole("link", { name: "Write New Post" })).toHaveAttribute("href", "/write");
  await page.screenshot({ animations: "disabled", path: "test-results/screenshots/admin.png" });

  await page.getByRole("link", { name: "Manage Users" }).click();
  await expect(page).toHaveURL(/\/users$/);
  const defaultDelete = page.getByRole("button", { name: "Delete Admin" }).first();
  await expect(defaultDelete).toBeDisabled();
  await expect(defaultDelete.locator("..")).toHaveAttribute("title", "Default admin cannot be deleted.");

  await page.getByLabel("Display Name").fill("Eligible User");
  await page.getByLabel("Username").fill("eligible-user");
  await page.getByLabel("Password").fill("demo-only");
  await page.getByLabel("Role").selectOption("user");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Account for Eligible User was created.")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_users"))[0])).toMatchObject({
    displayName: "Eligible User",
    username: "eligible-user",
    role: "user",
  });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Eligible User" }).first().click();
  await expect(page.getByText("Account for Eligible User was deleted.")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_users")))).toEqual([]);

  await page.getByLabel("Display Name").fill("Self Admin");
  await page.getByLabel("Username").fill("self-admin");
  await page.getByLabel("Password").fill("demo-only");
  await page.getByLabel("Role").selectOption("admin");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByText("Account for Self Admin was created.")).toBeVisible();
  const created = await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_users"))[0]);
  expect(created).toMatchObject({ displayName: "Self Admin", username: "self-admin", role: "admin" });

  await page.getByRole("button", { name: "Admin avatar Admin", exact: true }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await page
    .getByRole("navigation", { name: "Public navigation" })
    .getByRole("link", { name: "Login", exact: true })
    .click();
  await page.getByLabel("Username").fill("self-admin");
  await page.getByLabel("Password").fill("demo-only");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: "Manage Users" }).click();

  const selfDelete = page.getByRole("button", { name: "Delete Self Admin" }).first();
  await expect(selfDelete).toBeDisabled();
  await expect(selfDelete.locator("..")).toHaveAttribute("title", "You cannot delete the currently active account.");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_session")))).toEqual({
    userId: created.id,
    username: "self-admin",
    displayName: "Self Admin",
    role: "admin",
  });
});
