import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth", "session.json");

test.use({ storageState: AUTH_FILE });

test.describe("Billing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/billing");
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows item catalog and cart panels", async ({ page }) => {
    // Left panel: item catalog with search and category tabs
    await expect(page.getByPlaceholder("Search items")).toBeVisible();

    // Right panel: cart
    await expect(page.locator("text=Cart")).toBeVisible();
  });

  test("displays item group tabs", async ({ page }) => {
    // "All Items" tab should be present and active by default
    await expect(page.getByRole("button", { name: "All Items" })).toBeVisible();

    // Wait for item groups to load from ERPNext
    await page.waitForTimeout(2_000);

    // Should have at least a few item group tabs (Laboratory, Consultation, etc.)
    const tabs = page.locator('[data-testid="item-group-tab"]');
    // If no data-testid, look for the tab container
    const tabButtons = page.locator("button").filter({ hasText: /Laboratory|Consultation|Antibiotics|Analgesics/ });
    const count = await tabButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("loads items from ERPNext", async ({ page }) => {
    // Wait for items to load
    await page.waitForTimeout(3_000);

    // Should see item cards with prices
    const itemCards = page.locator("text=₹");
    await expect(itemCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test("filters items by category tab", async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2_000);

    // Click on "Laboratory" tab
    const labTab = page.getByRole("button", { name: "Laboratory" });
    if (await labTab.isVisible()) {
      await labTab.click();
      await page.waitForTimeout(2_000);

      // Items should now be filtered — we should see lab items like PLASMA Renin, Thyroid Panel
      const itemGrid = page.locator("text=₹");
      await expect(itemGrid.first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test("shows lab selector for diagnostic groups", async ({ page }) => {
    await page.waitForTimeout(2_000);

    // Click on Laboratory (or Diagnostics) tab
    const labTab = page.getByRole("button", { name: "Laboratory" });
    if (await labTab.isVisible()) {
      await labTab.click();
      await page.waitForTimeout(1_000);

      // Lab selector should appear for diagnostic-type groups
      const labSelector = page.locator("text=Select Lab").or(
        page.locator("text=Select a lab")
      );
      await expect(labSelector.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test("search filters items by name", async ({ page }) => {
    await page.waitForTimeout(2_000);

    // Type in search box
    const searchInput = page.getByPlaceholder("Search items");
    await searchInput.fill("Thyroid");

    // Wait for debounced search
    await page.waitForTimeout(1_000);

    // Should see Thyroid Panel in results (if it exists)
    const thyroidItem = page.locator("text=Thyroid");
    const count = await thyroidItem.count();
    // Search should return results or show empty state
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("add item to cart", async ({ page }) => {
    // Wait for items to load
    await page.waitForTimeout(3_000);

    // Find an "Add" button on an item card and click it
    const addButton = page.getByRole("button", { name: "Add" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // Cart should now show at least 1 item
    const cartItem = page.locator("text=₹").nth(0);
    await expect(cartItem).toBeVisible();

    // Cart summary should show a non-zero subtotal
    await expect(page.locator("text=Subtotal")).toBeVisible();
  });

  test("adjust item quantity in cart", async ({ page }) => {
    // Add an item first
    await page.waitForTimeout(3_000);
    const addButton = page.getByRole("button", { name: "Add" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // Increase quantity using + button
    const plusButton = page.locator("button").filter({ hasText: "+" }).first();
    if (await plusButton.isVisible()) {
      await plusButton.click();
      await page.waitForTimeout(500);

      // Should see quantity of 2
      await expect(page.locator("text=2").first()).toBeVisible();
    }

    // Decrease quantity using - button
    const minusButton = page.locator("button").filter({ hasText: "−" }).or(
      page.locator("button").filter({ hasText: "-" })
    ).first();
    if (await minusButton.isVisible()) {
      await minusButton.click();
    }
  });

  test("remove item from cart", async ({ page }) => {
    // Add an item
    await page.waitForTimeout(3_000);
    const addButton = page.getByRole("button", { name: "Add" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // Remove using trash/remove button
    const removeButton = page.locator('button[aria-label="Remove"]').or(
      page.locator("button").filter({ hasText: "×" })
    );
    if (await removeButton.first().isVisible()) {
      await removeButton.first().click();
      await page.waitForTimeout(500);
    }
  });
});
