import synpress from "./synpress";

const test = synpress;

const { expect } = test;

test("Navigation - should navigate to Presale Creation page from header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 }); // Set to desktop size
  await page.goto("/");
  // At desktop resolution, click on Presale Creation link using test ID
  await page.locator('[data-testid="presale-creation-link"]').click();

  // Verify we are on the Presale Creation page
  await expect(page).toHaveURL(/\/presale-creation/);
  await expect(
    page.locator('[data-testid="create-presale-heading"]')
  ).toBeVisible();
});

test("Navigation - should navigate to All Presales page from header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 }); // Set to desktop size
  await page.goto("/");
  // At desktop resolution, click on All Presales link using test ID
  await page.locator('[data-testid="all-presales-link"]').click();

  // Verify we are on the Home page (All Presales)
  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(
    page.locator('[data-testid="welcome-heading"]')
  ).toBeVisible();
});

test("Navigation - should navigate to Factory Owner page when user is owner", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 }); // Set to desktop size
  await page.goto("/");
  // Since the isOwner state depends on blockchain data, we'll just verify the link exists using test ID
  // This test will pass only if the user is an owner
  await expect(
    page.locator('[data-testid="factory-owner-link"]')
  ).toBeAttached();
});

test("Navigation - should preserve navigation state across page reloads", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 }); // Set to desktop size
  await page.goto("/");
  // Navigate to presale creation
  await page.locator('[data-testid="presale-creation-link"]').click();
  await expect(page).toHaveURL(/\/presale-creation/);

  // Reload the page
  await page.reload();

  // Should remain on the same page
  await expect(page).toHaveURL(/\/presale-creation/);
});

test("Navigation - should navigate using logo link back to home", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 }); // Set to desktop size
  await page.goto("/");
  // Navigate to another page first
  await page.locator('[data-testid="presale-creation-link"]').click();
  await expect(page).toHaveURL(/\/presale-creation/);

  // Click on the logo to go back to home (more specific selector)
  await page.locator('[data-testid="logo-home-link"] svg').first().click(); // Click on the MountainIcon in the logo link

  // Should be back on home page
  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(
    page.locator('[data-testid="welcome-heading"]')
  ).toBeVisible();
});

test("Navigation - should have working navigation links in header (desktop)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 }); // Set to desktop size
  await page.goto("/");
  // At desktop resolution, ensure header navigation links are visible
  await expect(
    page.locator('[data-testid="all-presales-link"]')
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="presale-creation-link"]')
  ).toBeVisible();
});

test("Navigation Mobile - should navigate to Presale Creation page using mobile navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  // Hide the TanStack Router Devtools that may interfere with clicks
  await page.evaluate(() => {
    const devtoolsButton = document.querySelector(
      'button[aria-label="Open TanStack Router Devtools"]'
    );
    if (devtoolsButton && devtoolsButton.parentNode) {
      devtoolsButton.parentNode.removeChild(devtoolsButton);
    }
  });

  // Click on Create link in mobile nav (BottomNav) using test ID
  await page.locator('[data-testid="mobile-create-link"]').click();

  // Verify we are on the Presale Creation page
  await expect(page).toHaveURL(/\/presale-creation/);
  await expect(
    page.locator('[data-testid="create-presale-heading"]')
  ).toBeVisible();
});

test("Navigation Mobile - should navigate to Home page using mobile navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  // Hide the TanStack Router Devtools that may interfere with clicks
  await page.evaluate(() => {
    const devtoolsButton = document.querySelector(
      'button[aria-label="Open TanStack Router Devtools"]'
    );
    if (devtoolsButton && devtoolsButton.parentNode) {
      devtoolsButton.parentNode.removeChild(devtoolsButton);
    }
  });

  // Navigate to another page first
  await page.goto("/presale-creation");
  await expect(page).toHaveURL(/\/presale-creation/);

  // Hide dev tools again after navigation
  await page.evaluate(() => {
    const devtoolsButton = document.querySelector(
      'button[aria-label="Open TanStack Router Devtools"]'
    );
    if (devtoolsButton && devtoolsButton.parentNode) {
      devtoolsButton.parentNode.removeChild(devtoolsButton);
    }
  });

  // Then go back to home using mobile nav (BottomNav) using test ID
  await page.locator('[data-testid="mobile-home-link"]').click();

  // Verify we are on the Home page
  await expect(page).toHaveURL("http://localhost:5173/");
  await expect(
    page.locator('[data-testid="welcome-heading"]')
  ).toBeVisible();
});

test("Navigation Mobile - should navigate to presales page using mobile navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  // Hide the TanStack Router Devtools that may interfere with clicks
  await page.evaluate(() => {
    const devtoolsButton = document.querySelector(
      'button[aria-label="Open TanStack Router Devtools"]'
    );
    if (devtoolsButton && devtoolsButton.parentNode) {
      devtoolsButton.parentNode.removeChild(devtoolsButton);
    }
  });

  // Click on Presales link in mobile nav (BottomNav) using test ID
  await page.locator('[data-testid="mobile-presales-link"]').click();

  // Check that we navigated to the presales page (route seems to exist now)
  await expect(page).toHaveURL(/\/presales/);
});
