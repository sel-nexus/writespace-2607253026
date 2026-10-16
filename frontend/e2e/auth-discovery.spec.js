import { expect, test } from "@playwright/test";

/** Capture browser errors for a journey and assert them after user actions. */
function captureBrowserErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => errors.push(`Request failed: ${request.url()}`));
  return errors;
}

test("guest discovers sorted local previews and is directed to login", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem("writespace_posts", JSON.stringify([
      {
        id: "00000000-0000-4000-8000-000000000001",
        title: "Earlier local note",
        content: "An earlier preview",
        createdAt: "2026-01-01T00:00:00.000Z",
        authorId: "8dbd86a0-c472-4707-a142-3d7f38664c57",
        authorName: "Morgan Lee",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        title: "Newest local note",
        content: "This content came from browser storage.",
        createdAt: "2026-03-01T00:00:00.000Z",
        authorId: "8dbd86a0-c472-4707-a142-3d7f38664c57",
        authorName: "Morgan Lee",
      },
    ]));
  });

  await page.goto("/");
  await expect(page.getByText("Your thoughts. Your space. Beautifully simple.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Newest local note" })).toBeVisible();
  await expect(page.getByText("This content came from browser storage.")).toBeVisible();
  await page.screenshot({ animations: "disabled", fullPage: true, path: "test-results/screenshots/landing.png" });
  await page.getByRole("link", { name: /Newest local note/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("visitor registers, persists the local account, and logs out", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Get Started", exact: true }).click();

  await expect(page.getByText(/Passwords are stored as plaintext/)).toBeVisible();
  await page.getByLabel("Display Name").fill("Taylor Reed");
  await page.getByLabel("Username").fill("taylor");
  await page.getByLabel("Password", { exact: true }).fill("demo-local");
  await page.getByLabel("Confirm Password").fill("demo-local");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByText("Taylor Reed")).toBeVisible();
  const storedUser = await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_users"))[0]);
  expect(storedUser).toMatchObject({ displayName: "Taylor Reed", username: "taylor", role: "user" });
  expect(storedUser.id).toMatch(/^[0-9a-f-]{36}$/i);

  await page.getByRole("button", { name: /Taylor Reed/ }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Get Started", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("writespace_session"))).toBeNull();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("stored user logs in after invalid credentials and persists the canonical session", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem("writespace_users", JSON.stringify([
      {
        id: "8dbd86a0-c472-4707-a142-3d7f38664c57",
        displayName: "Morgan Lee",
        username: "morgan",
        password: "demo-password",
        role: "user",
        createdAt: "2026-03-04T12:00:00.000Z",
      },
    ]));
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Public navigation" })
    .getByRole("link", { name: "Login", exact: true })
    .click();

  await page.getByLabel("Username").fill("morgan");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid username or password.");

  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByText("Morgan Lee")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_session")))).toEqual({
    userId: "8dbd86a0-c472-4707-a142-3d7f38664c57",
    username: "morgan",
    displayName: "Morgan Lee",
    role: "user",
  });

  await page.getByRole("button", { name: /Morgan Lee/ }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Public navigation" })
      .getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("built-in admin logs in to the admin dashboard with the canonical tuple", async ({ page }) => {
  const errors = captureBrowserErrors(page);
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
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_session")));
  expect(session).toEqual({ userId: "admin", username: "admin", displayName: "Admin", role: "admin" });

  await page.getByRole("button", { name: /Admin/ }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Get Started", exact: true })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("guest is redirected from a protected route and authenticated admin is allowed", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_session")))).toMatchObject({ role: "admin", username: "admin" });
  expect(errors, errors.join("\n")).toEqual([]);
});

test("authenticated mobile author uses the hamburger menu without horizontal overflow", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle navigation menu" }).click();
  await page.getByRole("link", { name: "Get Started", exact: true }).click();

  await page.getByLabel("Display Name").fill("Mobile Author");
  await page.getByLabel("Username").fill("mobile-author");
  await page.getByLabel("Password", { exact: true }).fill("mobile-demo");
  await page.getByLabel("Confirm Password").fill("mobile-demo");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole("button", { name: "Toggle navigation menu" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle navigation menu" }).click();
  const mobileMenu = page.locator("#authenticated-mobile-menu");
  await expect(mobileMenu).toBeVisible();
  await expect(mobileMenu.getByText("Mobile Author", { exact: true })).toBeVisible();
  await mobileMenu.getByRole("link", { name: "Write", exact: true }).click();

  await expect(page).toHaveURL(/\/write$/);
  await expect(page.getByRole("heading", { name: "Write a Post" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_users"))[0])).toMatchObject({
    displayName: "Mobile Author",
    username: "mobile-author",
    role: "user",
  });
  expect(errors, errors.join("\n")).toEqual([]);
});
