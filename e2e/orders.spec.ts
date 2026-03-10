import { test, expect } from "@playwright/test";

test.describe("Order History", () => {
  test("navigate to orders page", async ({ page }) => {
    await page.goto("/orders");

    // Should show orders page heading
    await expect(
      page.getByRole("heading", { name: /orders/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows today's orders or empty state", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForTimeout(3_000);

    // Should show either order cards or "No orders" message
    const content = page
      .locator("text=No orders")
      .or(page.locator("text=₹"));
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigate back to billing from orders", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForTimeout(2_000);

    // Click on billing link/tab
    const billingLink = page
      .locator("a[href='/billing']")
      .or(page.getByRole("link", { name: /billing|pos|back/i }));
    if (await billingLink.first().isVisible()) {
      await billingLink.first().click();
      await page.waitForURL("**/billing");
    }
  });
});
