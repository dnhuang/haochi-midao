import { test, expect } from "@playwright/test";

test.describe("Upload flow", () => {
  test("login page is shown initially", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("好吃米道")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Invalid password")).toBeVisible();
  });

  test("successful login shows upload page", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Password").fill("testpassword");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Upload WeChat Export")).toBeVisible();
  });
});
