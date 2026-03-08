import { defineConfig, devices } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "e2e", ".auth", "session.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Auth setup — runs first to create session state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Auth flow tests — no saved state, tests raw login/logout
    {
      name: "auth-flow",
      testMatch: /auth-flow\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // All other tests — use saved auth state from setup
    {
      name: "authenticated",
      testMatch: /(?!auth).*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_FILE,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
