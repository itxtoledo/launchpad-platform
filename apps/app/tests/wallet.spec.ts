import { test, expect } from '@playwright/test';

test('has connect wallet button', async ({ page }) => {
  await page.goto('/');

  // Expect a heading to contain a substring.
  await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
});

test('clicking connect wallet button opens modal with metamask option', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Connect wallet' }).click();

  await expect(page.getByTestId('rk-wallet-option-metaMask')).toBeVisible();
});
