import { test, expect } from '../fixtures';

test.describe.serial('Rename & Optional Buying Price', () => {

  // ── Setup: Clean up stale test data, then create a test category + subcategory ──
  test('Create test category with subcategory', async ({ authenticatedPage: page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Clean up any stale test categories from previous runs
    for (const stale of ['Test Rename Cat', 'Renamed Category']) {
      const staleCard = page.locator('[data-slot="card"]').filter({
        has: page.locator('span.font-semibold', { hasText: stale }),
      });
      if (await staleCard.count() > 0) {
        await staleCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
        // Click the action button in the alert dialog
        await page.locator('[data-slot="alert-dialog-action"]').click();
        await page.waitForTimeout(1000);
      }
    }

    // Create category
    await page.getByRole('button', { name: /add category/i }).click();
    await page.getByPlaceholder(/paper envelope/i).waitFor({ state: 'visible' });
    await page.getByPlaceholder(/paper envelope/i).fill('Test Rename Cat');
    await page.getByRole('button', { name: /^add$/i }).click();
    await expect(page.locator('span.font-semibold', { hasText: 'Test Rename Cat' })).toBeVisible({ timeout: 5000 });

    // Add subcategory
    const catCard = page.locator('[data-slot="card"]').filter({
      has: page.locator('span.font-semibold', { hasText: 'Test Rename Cat' }),
    });
    await catCard.getByRole('button', { name: /sub/i }).click();
    const subInput = page.getByPlaceholder(/comma separated/i).or(page.getByPlaceholder(/a4 size/i));
    await subInput.waitFor({ state: 'visible' });
    await subInput.fill('Old Sub Name');
    await page.getByRole('button', { name: /^add$/i }).click();
    await page.waitForTimeout(500);

    // Expand and verify
    await page.locator('span.font-semibold', { hasText: 'Test Rename Cat' }).click();
    await expect(page.getByText('Old Sub Name', { exact: true }).first()).toBeVisible({ timeout: 3000 });
  });

  // ── Test: Rename category ──
  test('Rename category', async ({ authenticatedPage: page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const catCard = page.locator('[data-slot="card"]').filter({
      has: page.locator('span.font-semibold', { hasText: 'Test Rename Cat' }),
    });

    // Click Rename button
    await catCard.getByRole('button', { name: /rename/i }).click();

    // Dialog should open with current name
    const nameInput = page.locator('div[role="dialog"] input');
    await nameInput.waitFor({ state: 'visible' });
    await expect(nameInput).toHaveValue('Test Rename Cat');

    // Clear and type new name
    await nameInput.clear();
    await nameInput.fill('Renamed Category');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify toast + new name visible
    await expect(page.getByText(/renamed/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('span.font-semibold', { hasText: 'Renamed Category' })).toBeVisible();
  });

  // ── Test: Rename subcategory ──
  test('Rename subcategory', async ({ authenticatedPage: page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Expand the renamed category
    await page.locator('span.font-semibold', { hasText: 'Renamed Category' }).click();
    await page.waitForTimeout(500);

    // Find the subcategory text, then go up to its row and click the edit (pencil) button
    const subText = page.locator('span.text-sm.text-gray-700', { hasText: 'Old Sub Name' });
    await expect(subText).toBeVisible({ timeout: 5000 });
    // The edit button is in a sibling div; go up to the row container
    const subRow = subText.locator('xpath=ancestor::div[contains(@class,"justify-between")]');
    await subRow.locator('button').first().click();

    // Dialog should open
    const nameInput = page.locator('div[role="dialog"] input');
    await nameInput.waitFor({ state: 'visible' });
    await expect(nameInput).toHaveValue('Old Sub Name');

    // Rename
    await nameInput.clear();
    await nameInput.fill('Renamed Sub');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify
    await expect(page.getByText(/renamed/i).first()).toBeVisible({ timeout: 5000 });
    // Re-expand category to see the renamed subcategory  
    await page.waitForTimeout(300);
    const catSpan = page.locator('span.font-semibold', { hasText: 'Renamed Category' });
    // Click twice: once to collapse (if open), once to expand
    await catSpan.click();
    await page.waitForTimeout(200);
    await catSpan.click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Renamed Sub', { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  // ── Test: Add stock item without buying price ──
  test('Add stock item without buying price', async ({ authenticatedPage: page }) => {
    await page.goto('/stock');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add stock item/i }).click();
    await page.waitForLoadState('networkidle');

    // Fill item name
    const nameInput = page.getByPlaceholder('Search or type item name...').or(
      page.getByPlaceholder('Enter item name'),
    );
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill('Test No-Buy-Price Item');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.locator('h1').first().click();

    // Fill SKU
    await page.locator('input[placeholder="ACC-MRK-001"]').fill('TNBP-001');

    // Select Category
    const categorySelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'Select category' }),
    });
    await categorySelect.selectOption({ label: 'Renamed Category' });
    await page.waitForTimeout(300);

    // Select Subcategory
    const subSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'Select subcategory' }),
    });
    await subSelect.selectOption({ label: 'Renamed Sub' });

    // Fill stock fields but skip buying price
    const stockInputs = page.locator('input[type="number"][placeholder="0"]');
    await stockInputs.first().fill('100');   // current stock
    await stockInputs.nth(1).fill('10');     // reorder level

    // Only fill selling price, leave buying price empty
    const priceInputs = page.locator('input[type="number"][placeholder="0.00"]');
    // buying price (first) — leave empty
    // selling price (second)
    await priceInputs.nth(1).fill('25');

    // The Add button should be enabled (buying price is optional)
    const addBtn = page.getByRole('button', { name: /add stock item/i });
    await expect(addBtn).toBeEnabled();
    await addBtn.click();

    // Verify success
    await expect(page.getByText(/added successfully/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ── Cleanup: delete test category ──
  test('Cleanup test data', async ({ authenticatedPage: page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const catCard = page.locator('[data-slot="card"]').filter({
      has: page.locator('span.font-semibold', { hasText: 'Renamed Category' }),
    });

    // Click delete button (trash icon)
    await catCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();

    // Confirm deletion
    await page.locator('[data-slot="alert-dialog-action"]').click();
    await expect(page.getByText(/deleted/i).first()).toBeVisible({ timeout: 5000 });
  });
});
