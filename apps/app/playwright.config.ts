import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Look for test files in the "test/e2e" directory, relative to this configuration file.
  testDir: "./test/playwright",

  // Run all tests in parallel.
  fullyParallel: false,

  // Use half of the number of logical CPU cores for running tests in parallel.
  workers: undefined,

  use: {
    // We are using locally deployed MetaMask Test Dapp.
    baseURL: "http://localhost:5173",
    // Run tests in headless mode
    headless: true,
  },

  // Synpress currently only supports Chromium, however, this will change in the future.
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], headless: true },
    },
  ],

  // Serve MetaMask Test Dapp locally before starting the tests.
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
