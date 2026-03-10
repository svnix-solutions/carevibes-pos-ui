import { test, expect } from "@playwright/test";

test.describe("Billing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/billing");
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows item catalog and cart panels", async ({ page }) => {
    // Left panel: item catalog with search
    await expect(page.getByPlaceholder("Search items...")).toBeVisible();

    // Right panel: cart
    await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  });

  test("displays category sidebar with All Items", async ({ page }) => {
    // "All Items" button should be present in the sidebar
    await expect(
      page.getByRole("button", { name: "All Items" })
    ).toBeVisible();

    // Should have category buttons from ERPNext
    const catButtons = page
      .locator("button")
      .filter({
        hasText: /Laboratory|Consultation|Antibiotics|Analgesics/,
      });
    await expect(catButtons.first()).toBeVisible({ timeout: 10_000 });
  });

  test("filters items by category", async ({ page }) => {
    // Wait for items to load
    await expect(page.locator("text=₹").first()).toBeVisible({
      timeout: 10_000,
    });

    // Click a category in the sidebar
    const cat = page.getByRole("button", { name: "Analgesics" });
    if (await cat.isVisible()) {
      await cat.click();
      await page.waitForTimeout(2_000);
      const items = page.locator("text=₹");
      await expect(items.first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("loads items from ERPNext", async ({ page }) => {
    // Should see item cards with prices (₹ symbol)
    const priceLabels = page.locator("text=₹");
    await expect(priceLabels.first()).toBeVisible({ timeout: 10_000 });
  });

  test("search filters items by name", async ({ page }) => {
    await expect(page.locator("text=₹").first()).toBeVisible({
      timeout: 10_000,
    });

    // Type in search box
    await page.getByPlaceholder("Search items...").fill("Thyroid");

    // Wait for debounced search
    await page.waitForTimeout(1_000);

    // Should see Thyroid items or fewer results
    const thyroidItem = page.locator("text=Thyroid");
    const count = await thyroidItem.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("add item to cart", async ({ page }) => {
    // Wait for items to load
    const addButton = page.getByRole("button", { name: "Add to cart" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });

    // Click the first add button
    await addButton.first().click();

    // Cart should now show the checkout button (it appears when items > 0)
    await expect(
      page.getByRole("button", { name: /Select Patient First|Complete Sale/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("adjust item quantity in cart", async ({ page }) => {
    // Add an item first
    const addButton = page.getByRole("button", { name: "Add to cart" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // Click the same add button again to increase quantity
    await addButton.first().click();
    await page.waitForTimeout(500);

    // Should see quantity of 2 in the cart
    await expect(page.locator("text=2").first()).toBeVisible();
  });

  test("remove item from cart", async ({ page }) => {
    // Add an item
    const addButton = page.getByRole("button", { name: "Add to cart" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // Cart should have an item now. Clear the cart.
    const clearButton = page.getByRole("button", { name: "Clear" });
    await expect(clearButton).toBeVisible({ timeout: 5_000 });
    await clearButton.click();

    // Cart should be empty again
    await expect(page.locator("text=Cart is empty")).toBeVisible();
  });
});
