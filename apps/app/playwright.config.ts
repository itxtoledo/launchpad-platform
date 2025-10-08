import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Look for test files in the "test/e2e" directory, relative to this configuration file.
  testDir: "./test/playwright",

  // Run tests in parallel for better performance
  fullyParallel: true,

  // Use more workers for faster execution (use more than half the CPU cores if available)
  workers: "50%",

  // Retry failed tests to handle flakiness
  retries: 1,

  // Optimize test timeout settings
  timeout: 30000, // Global timeout for each test
  expect: {
    timeout: 10000, // Timeout for expect() calls
  },

  use: {
    // We are using locally deployed MetaMask Test Dapp.
    baseURL: "http://localhost:5173",
    // Run tests in headless mode
    headless: true,
    
    // Optimize browser settings for faster execution
    viewport: { width: 1280, height: 720 }, // Set default viewport to avoid repeated changes
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    video: "retry-with-video", // Only capture video on retry to optimize performance
    
    // Optimize action settings
    actionTimeout: 10000,
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
