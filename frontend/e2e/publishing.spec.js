import { expect, test } from "@playwright/test";

/** Capture console, runtime, and request errors for one browser journey. */
function captureBrowserErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => errors.push(`Request failed: ${request.url()}`));
  return errors;
}

test("registered author creates, reads, edits, and deletes persisted plain text", async ({ page }) => {
  const errors = captureBrowserErrors(page);
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("link", { name: "Get Started", exact: true }).click();

  await page.getByLabel("Display Name").fill("Publishing Author");
  await page.getByLabel("Username").fill("publisher");
  await page.getByLabel("Password", { exact: true }).fill("demo-only");
  await page.getByLabel("Confirm Password").fill("demo-only");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByText("No blogs yet. Be the first to write one!")).toBeVisible();

  await page.getByRole("link", { name: "Write New Post" }).click();
  const originalContent = "First line\nSecond line <script>not executable</script>";
  await page.getByLabel("Title").fill("A persisted beginning");
  await page.getByLabel("Content").fill(originalContent);
  await expect(page.getByText(`${originalContent.length} characters`)).toBeVisible();
  await page.getByRole("button", { name: "Publish Post" }).click();

  await expect(page).toHaveURL(/\/blog\/[0-9a-f-]+$/i);
  await expect(page.getByRole("heading", { name: "A persisted beginning" })).toBeVisible();
  await expect(page.getByText(/First line\s+Second line <script>not executable<\/script>/)).toBeVisible();
  const created = await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_posts"))[0]);
  expect(created).toMatchObject({
    title: "A persisted beginning",
    authorName: "Publishing Author",
  });
  expect(created.content).toBe(originalContent);
  await page.screenshot({ animations: "disabled", path: "test-results/screenshots/publishing.png" });

  await page.getByRole("link", { name: "Edit Post" }).click();
  await page.getByLabel("Title").fill("A persisted revision");
  await page.getByLabel("Content").fill("Edited local content");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("heading", { name: "A persisted revision" })).toBeVisible();
  const edited = await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_posts"))[0]);
  expect(edited).toMatchObject({
    id: created.id,
    createdAt: created.createdAt,
    authorId: created.authorId,
    authorName: created.authorName,
    title: "A persisted revision",
    content: "Edited local content",
  });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Post" }).click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByText("No blogs yet. Be the first to write one!")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("writespace_posts")))).toEqual([]);
  expect(errors, errors.join("\n")).toEqual([]);
});
