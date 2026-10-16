/** Verify that the completed UI surfaces corrupt local data without crashing. */
import { expect, test } from "@playwright/test";

test.describe("storage resilience", () => {
  test("shows a visible recovery warning for malformed local post storage", async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "warning" || message.type() === "error") {
        errors.push(`console ${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    await page.addInitScript(() => {
      localStorage.setItem("writespace_posts", "{malformed-json");
    });

    await page.goto("/");

    const warning = page.getByRole("alert");
    await expect(warning).toHaveText(
      "Saved posts are unavailable. Check or clear this browser’s local data before continuing.",
    );
    await expect(warning).toBeVisible();
    await expect(page.locator("body")).toContainText("WriteSpace");
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
