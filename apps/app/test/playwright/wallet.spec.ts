import synpress from "./synpress";

const test = synpress;

const { expect } = test;

test("Wallet - has connect wallet button", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator('[data-testid="connect-wallet-button"]')
  ).toBeVisible();
});

// Skipping MetaMask-specific test due to Chrome extension limitations
test("Wallet - clicking connect wallet button opens modal with metamask option", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-testid="connect-wallet-button"]').click();
  await expect(
    page.locator('[data-testid="rk-wallet-option-metaMask"]')
  ).toBeVisible();
});
