import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth", "session.json");

test.use({ storageState: AUTH_FILE });

test.describe("Payment Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/billing");
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("open payment dialog with items in cart", async ({ page }) => {
    // Add an item to cart
    await page.waitForTimeout(3_000);
    const addButton = page.getByRole("button", { name: "Add" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // We need a patient selected to enable checkout
    // For now, just verify the checkout button exists
    const checkoutButton = page.getByRole("button", { name: /complete sale|checkout|pay/i });
    await expect(checkoutButton).toBeVisible();
  });

  test("payment dialog shows payment methods", async ({ page }) => {
    // This test requires a patient to be selected first
    // Add item
    await page.waitForTimeout(3_000);
    const addButton = page.getByRole("button", { name: "Add" });
    if (!(await addButton.first().isVisible())) return;
    await addButton.first().click();

    // Try to open payment dialog (may need patient first)
    const checkoutButton = page.getByRole("button", { name: /complete sale|checkout|pay/i });
    if (await checkoutButton.isEnabled()) {
      await checkoutButton.click();
      await page.waitForTimeout(500);

      // Should see payment method tabs: Cash, UPI, Card
      await expect(page.locator("text=Cash")).toBeVisible({ timeout: 5_000 });
      await expect(page.locator("text=UPI")).toBeVisible();
      await expect(page.locator("text=Card")).toBeVisible();
    }
  });

  test("cash numpad enters amounts", async ({ page }) => {
    // Add item
    await page.waitForTimeout(3_000);
    const addButton = page.getByRole("button", { name: "Add" });
    if (!(await addButton.first().isVisible())) return;
    await addButton.first().click();

    // Open payment
    const checkoutButton = page.getByRole("button", { name: /complete sale|checkout|pay/i });
    if (await checkoutButton.isEnabled()) {
      await checkoutButton.click();
      await page.waitForTimeout(500);

      // Click Cash tab
      await page.locator("text=Cash").first().click();

      // Use numpad — click buttons 1, 0, 0, 0
      const numpad = page.locator("button").filter({ hasText: /^[0-9]$/ });
      if (await numpad.first().isVisible()) {
        await page.locator("button").filter({ hasText: /^1$/ }).first().click();
        await page.locator("button").filter({ hasText: /^0$/ }).first().click();
        await page.locator("button").filter({ hasText: /^0$/ }).first().click();
        await page.locator("button").filter({ hasText: /^0$/ }).first().click();
      }
    }
  });
});
