import { test, expect } from '@playwright/test';

test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has connect wallet button', async ({ page }) => {
    await expect(page.locator('[data-testid="connect-wallet-button"]')).toBeVisible();
  });

  // Skipping MetaMask-specific test due to Chrome extension limitations
  test('clicking connect wallet button opens modal with metamask option', async ({ page }) => {
    await page.locator('[data-testid="connect-wallet-button"]').click();
    await expect(page.locator('[data-testid="rk-wallet-option-metaMask"]')).toBeVisible();
  });
});