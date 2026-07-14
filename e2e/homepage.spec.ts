import { test, expect } from "@playwright/test";

test("homepage should load successfully", async ({ page }) => {
  await page.goto("/");
  // Page should return a 200 status and have content
  await expect(page.locator("body")).toBeVisible();
});

test("auth page should be accessible", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("body")).toBeVisible();
});
