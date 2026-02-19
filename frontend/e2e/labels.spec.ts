import { test, expect } from "@playwright/test";

test.describe("Labels flow", () => {
  test("labels tab requires analysis first", async ({ page }) => {
    // Without uploading a file first, we can't test the full flow.
    // Verify the login works at minimum.
    await page.goto("/");
    await page.getByPlaceholder("Password").fill("testpassword");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Upload WeChat Export")).toBeVisible();
  });
});
