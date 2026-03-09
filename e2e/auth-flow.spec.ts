import { test, expect } from "@playwright/test";

/**
 * Helper: complete the Supabase login + consent flow.
 * Handles: login page → fill creds → submit → consent page → Allow Access → redirect
 */
async function loginViaBridge(page: import("@playwright/test").Page) {
  // Wait for the Supabase login page (on carevibes-auth)
  await page.waitForURL("**/login**", { timeout: 15_000 });

  // Fill in Supabase credentials
  await page.locator("#email").fill("shubhankar@svnix.solutions");
  await page.locator("#password").fill("SVNIX_Shubhankar");
  await page.locator('button[type="submit"]').click();

  // After login, Supabase OAuth shows a consent page — click "Allow Access"
  // (auto-approve may skip this if user already consented)
  const allowButton = page.getByRole("button", { name: "Allow Access" });
  try {
    await allowButton.waitFor({ timeout: 10_000 });
    await allowButton.click();
  } catch {
    // Consent was auto-approved or flow already redirected — continue
  }

  // Wait for the full redirect chain to complete → /billing
  await page.waitForURL("**/billing", { timeout: 30_000 });
}

test.describe("Authentication Flow", () => {
  // Don't use saved auth state — test the raw flow
  test.use({ storageState: undefined });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/billing");

    // Middleware should redirect to /login, which redirects to bridge
    // Wait for redirect chain — we should end up on the auth bridge login page
    await page.waitForURL("**/{login,authorize}**", { timeout: 15_000 });
  });

  test("full login flow: POS → bridge → Supabase → callback → billing", async ({ page }) => {
    // Start at POS root
    await page.goto("/");

    // Complete the full login flow
    await loginViaBridge(page);

    // Verify billing page loaded
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });

    // Verify session cookie exists
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "pos_session");
    expect(sessionCookie).toBeDefined();
  });

  test("logout clears session cookie", async ({ page }) => {
    // First, log in
    await page.goto("/");
    await loginViaBridge(page);

    // Verify session cookie exists before logout
    let cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "pos_session")).toBeDefined();

    // Click logout button (icon button with aria-label)
    await page.getByRole("button", { name: "Logout" }).click();

    // Wait for navigation away from billing (logout triggers router.push("/login"))
    await page.waitForURL((url) => url.pathname !== "/billing", {
      timeout: 15_000,
    });

    // Session cookie should be cleared by the logout API
    cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "pos_session");
    expect(sessionCookie).toBeUndefined();
  });
});
