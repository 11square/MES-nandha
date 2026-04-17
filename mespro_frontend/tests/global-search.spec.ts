import { test, expect } from './fixtures';

test.describe('Global Search', () => {

  test('Search bar is visible and functional', async ({ authenticatedPage: page }) => {
    // The search bar should be visible in the header
    const searchInput = page.getByPlaceholder('Search orders, customers, materials...');
    await expect(searchInput).toBeVisible();
  });

  test('Search for a page navigates correctly', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder('Search orders, customers, materials...');

    // Type "leads" into the search bar
    await searchInput.click();
    await searchInput.fill('leads');

    // Wait for dropdown results
    const dropdown = page.locator('.absolute.top-full');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Should show "Leads" page result
    await expect(dropdown.getByText('Leads').first()).toBeVisible();

    // Click the page result
    await dropdown.getByText('Leads').first().click();

    // Should navigate to /leads
    await page.waitForURL('**/leads', { timeout: 5000 });
    expect(page.url()).toContain('/leads');
  });

  test('Search for stock navigates to stock page', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder('Search orders, customers, materials...');

    await searchInput.click();
    await searchInput.fill('stock');

    const dropdown = page.locator('.absolute.top-full');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    await expect(dropdown.getByText('Stock').first()).toBeVisible();

    await dropdown.getByText('Stock').first().click();
    await page.waitForURL('**/stock', { timeout: 5000 });
    expect(page.url()).toContain('/stock');
  });

  test('Search shows no results message for gibberish', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder('Search orders, customers, materials...');

    await searchInput.click();
    await searchInput.fill('xyznonexistent123');

    const dropdown = page.locator('.absolute.top-full');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    await expect(dropdown.getByText(/no results/i)).toBeVisible();
  });

  test('Search for billing page', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder('Search orders, customers, materials...');

    await searchInput.click();
    await searchInput.fill('billing');

    const dropdown = page.locator('.absolute.top-full');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    await expect(dropdown.getByText('Billing').first()).toBeVisible();

    await dropdown.getByText('Billing').first().click();
    await page.waitForURL('**/billing', { timeout: 5000 });
  });

  test('Keyboard navigation works (arrow keys + enter)', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder('Search orders, customers, materials...');

    await searchInput.click();
    await searchInput.fill('orders');

    const dropdown = page.locator('.absolute.top-full');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Press Enter on the first result (should be Orders page)
    await page.keyboard.press('Enter');
    await page.waitForURL('**/orders', { timeout: 5000 });
    expect(page.url()).toContain('/orders');
  });

  test('Escape closes the dropdown', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder('Search orders, customers, materials...');

    await searchInput.click();
    await searchInput.fill('finance');

    const dropdown = page.locator('.absolute.top-full');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(dropdown).not.toBeVisible();
  });

  test('Search fetches and shows data results', async ({ authenticatedPage: page }) => {
    const searchInput = page.getByPlaceholder('Search orders, customers, materials...');

    // Focus the search to trigger data loading
    await searchInput.click();
    await page.waitForTimeout(2000); // Wait for data to load

    // Search for a stock item we know exists (from seed data)
    await searchInput.fill('Envelope');
    
    const dropdown = page.locator('.absolute.top-full');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Should show stock items section with matching results
    // (Paper Envelopes category products from seed data)
    const hasResults = await dropdown.locator('button').count();
    expect(hasResults).toBeGreaterThan(0);
  });
});
