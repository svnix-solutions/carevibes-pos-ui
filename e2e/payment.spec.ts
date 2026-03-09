import { test, expect } from "@playwright/test";

test.describe("Payment Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/billing");
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("checkout button shows after adding item", async ({ page }) => {
    // Add an item to cart
    const addButton = page.getByRole("button", { name: "Add to cart" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // Checkout button should appear (disabled without patient)
    const checkoutButton = page.getByRole("button", {
      name: "Select Patient First",
    });
    await expect(checkoutButton).toBeVisible({ timeout: 5_000 });
    await expect(checkoutButton).toBeDisabled();
  });

  test("cart shows subtotal after adding items", async ({ page }) => {
    // Add an item
    const addButton = page.getByRole("button", { name: "Add to cart" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // Should see Subtotal in the cart summary
    await expect(page.locator("text=Subtotal")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("cart persists items across page reload", async ({ page }) => {
    // Add an item
    const addButton = page.getByRole("button", { name: "Add to cart" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // Verify checkout button appears
    await expect(
      page.getByRole("button", { name: "Select Patient First" })
    ).toBeVisible({ timeout: 5_000 });

    // Reload the page
    await page.reload();
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });

    // Cart should still have the item (Zustand persist)
    await expect(
      page.getByRole("button", { name: /Select Patient First|Complete Sale/i })
    ).toBeVisible({ timeout: 5_000 });
  });
});
