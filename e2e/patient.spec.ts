import { test, expect } from "@playwright/test";

test.describe("Patient Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/billing");
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows patient search in header", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Select Patient" })
    ).toBeVisible();
  });

  test("opens patient search popover", async ({ page }) => {
    // Click on the patient search trigger
    await page.getByRole("button", { name: "Select Patient" }).click();

    // Should see a search input inside the popover
    await expect(
      page.getByPlaceholder("Search by name or phone...")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("search for patient by name", async ({ page }) => {
    // Open patient search
    await page.getByRole("button", { name: "Select Patient" }).click();

    // Type a search query (needs at least 2 chars)
    await page
      .getByPlaceholder("Search by name or phone...")
      .fill("test");

    // Wait for debounced search (300ms + network)
    await page.waitForTimeout(2_000);

    // Should see results or "No patients found" message
    const results = page
      .locator("text=No patients found")
      .or(page.locator("text=Searching..."))
      .or(page.locator(".max-h-60 button"));
    await expect(results.first()).toBeVisible({ timeout: 5_000 });
  });

  test("checkout button disabled without patient", async ({ page }) => {
    // Add an item to cart first
    const addButton = page.getByRole("button", { name: "Add to cart" });
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 });
    await addButton.first().click();

    // "Select Patient First" button should be visible and disabled
    const checkoutButton = page.getByRole("button", {
      name: "Select Patient First",
    });
    await expect(checkoutButton).toBeVisible({ timeout: 5_000 });
    await expect(checkoutButton).toBeDisabled();
  });
});
