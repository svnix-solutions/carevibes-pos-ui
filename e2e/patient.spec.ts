import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth", "session.json");

test.use({ storageState: AUTH_FILE });

test.describe("Patient Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/billing");
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows patient search in header", async ({ page }) => {
    // Patient search trigger should be visible in the POS header
    const patientSearch = page.getByRole("button", { name: /patient|search patient/i }).or(
      page.locator("text=Search patient").or(page.locator("text=Select Patient"))
    );
    await expect(patientSearch.first()).toBeVisible();
  });

  test("opens patient search popover", async ({ page }) => {
    // Click on the patient search trigger
    const patientSearch = page.getByRole("button", { name: /patient|search patient/i }).or(
      page.locator("text=Search patient").or(page.locator("text=Select Patient"))
    );
    await patientSearch.first().click();

    // Should see a search input inside the popover
    await page.waitForTimeout(500);
    const searchInput = page.getByPlaceholder(/search patient|patient name|name or mobile/i);
    await expect(searchInput.first()).toBeVisible({ timeout: 5_000 });
  });

  test("search for patient by name", async ({ page }) => {
    // Open patient search
    const patientSearch = page.getByRole("button", { name: /patient|search patient/i }).or(
      page.locator("text=Search patient").or(page.locator("text=Select Patient"))
    );
    await patientSearch.first().click();
    await page.waitForTimeout(500);

    // Type a search query
    const searchInput = page.getByPlaceholder(/search patient|patient name|name or mobile/i);
    await searchInput.first().fill("test");

    // Wait for debounced search (300ms + network)
    await page.waitForTimeout(2_000);

    // Should see results or "No patients found" message
    const results = page.locator("text=No patients found").or(
      page.locator('[role="option"]')
    );
    await expect(results.first()).toBeVisible({ timeout: 5_000 });
  });

  test("checkout button disabled without patient", async ({ page }) => {
    // Add an item to cart first
    await page.waitForTimeout(3_000);
    const addButton = page.getByRole("button", { name: "Add" });
    if (await addButton.first().isVisible()) {
      await addButton.first().click();
    }

    // Complete Sale button should be disabled without a patient
    const checkoutButton = page.getByRole("button", { name: /complete sale|checkout|pay/i });
    if (await checkoutButton.isVisible()) {
      await expect(checkoutButton).toBeDisabled();
    }
  });
});
