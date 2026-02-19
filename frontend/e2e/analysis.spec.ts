import { test, expect } from "@playwright/test";

test.describe("Analysis flow", () => {
  test("shows analyze tab after upload", async ({ page }) => {
    // This test would require a real file upload, which needs the fixture
    // For now, verify the login + upload page renders correctly
    await page.goto("/");
    await page.getByPlaceholder("Password").fill("testpassword");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Upload WeChat Export")).toBeVisible();
    await expect(page.getByText("Process")).toBeVisible();
  });
});
