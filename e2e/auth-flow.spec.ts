import { test, expect } from "@playwright/test";

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

    // Should redirect to /login → bridge authorize → Supabase login
    await page.waitForURL("**/login**", { timeout: 15_000 });

    // Fill in Supabase credentials on carevibes-auth login page
    await page.locator("#email").fill("shubhankar@svnix.solutions");
    await page.locator("#password").fill("SVNIX_Shubhankar");
    await page.locator('button[type="submit"]').click();

    // Wait for full redirect chain to complete
    // Supabase auth → bridge callback → consent → POS /auth/callback → /billing
    await page.waitForURL("**/billing", { timeout: 30_000 });

    // Verify billing page loaded
    await expect(page.locator("text=CareVibes POS")).toBeVisible({
      timeout: 10_000,
    });

    // Verify session cookie exists
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "pos_session");
    expect(sessionCookie).toBeDefined();
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    // First, log in
    await page.goto("/");
    await page.waitForURL("**/login**", { timeout: 15_000 });
    await page.locator("#email").fill("shubhankar@svnix.solutions");
    await page.locator("#password").fill("SVNIX_Shubhankar");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL("**/billing", { timeout: 30_000 });

    // Click logout button
    const logoutButton = page.getByRole("button", { name: /logout|sign out/i }).or(
      page.locator("text=Logout").or(page.locator("text=Sign Out"))
    );
    await logoutButton.first().click();

    // Should redirect to login page
    await page.waitForURL("**/{login,authorize}**", { timeout: 15_000 });

    // Session cookie should be gone
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "pos_session");
    expect(sessionCookie).toBeUndefined();
  });
});
