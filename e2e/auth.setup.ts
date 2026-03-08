import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth", "session.json");

/**
 * Authenticate once via the full OAuth flow:
 * POS /login → bridge authorize → Supabase login → bridge callback → POS /auth/callback → /billing
 *
 * Prerequisites:
 * 1. Server Script `pos_exchange_token` created in ERPNext
 * 2. POS callback URL added to BRIDGE_ALLOWED_REDIRECT_URIS in carevibes-auth-ui
 * 3. .env.local configured with valid values
 */
setup("authenticate via bridge", async ({ page }) => {
  // Go to POS login — should redirect through bridge to Supabase login
  await page.goto("/login");

  // Wait for Supabase login page on carevibes-auth.netlify.app
  await page.waitForURL("**/login**", { timeout: 15_000 });

  // Fill in Supabase credentials
  await page.locator("#email").fill("shubhankar@svnix.solutions");
  await page.locator("#password").fill("SVNIX_Shubhankar");
  await page.locator('button[type="submit"]').click();

  // Wait for the OAuth redirect chain to complete:
  // Supabase → bridge callback → bridge consent → POS /auth/callback → /billing
  await page.waitForURL("**/billing", { timeout: 30_000 });

  // Verify we landed on the billing page
  await expect(page.locator("text=CareVibes POS")).toBeVisible({
    timeout: 10_000,
  });

  // Save auth state (cookies) for reuse in other tests
  await page.context().storageState({ path: AUTH_FILE });
});
