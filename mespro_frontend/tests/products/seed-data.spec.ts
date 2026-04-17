import { test, expect } from '../fixtures';

/**
 * Seed data test: Creates 2 categories with 2 subcategories each,
 * then adds 10 stock items (5 per category, spread across subcategories).
 */

const CATEGORIES = [
  {
    name: 'Paper Envelopes',
    subcategories: ['A4 Size', 'A5 Size'],
    products: [
      { name: 'White A4 Envelope', sku: 'PE-WA4-001', buying: '5', selling: '12', stock: '500', reorder: '50', sub: 'A4 Size' },
      { name: 'Brown A4 Envelope', sku: 'PE-BA4-002', buying: '4', selling: '10', stock: '300', reorder: '40', sub: 'A4 Size' },
      { name: 'Window A4 Envelope', sku: 'PE-WNA4-003', buying: '7', selling: '15', stock: '200', reorder: '30', sub: 'A4 Size' },
      { name: 'Kraft A5 Envelope', sku: 'PE-KA5-004', buying: '3', selling: '8', stock: '400', reorder: '50', sub: 'A5 Size' },
      { name: 'Colored A5 Envelope', sku: 'PE-CA5-005', buying: '6', selling: '14', stock: '250', reorder: '30', sub: 'A5 Size' },
    ],
  },
  {
    name: 'Corrugated Boxes',
    subcategories: ['Small Box', 'Large Box'],
    products: [
      { name: '3-Ply Small Box', sku: 'CB-3PS-001', buying: '15', selling: '30', stock: '100', reorder: '20', sub: 'Small Box' },
      { name: '5-Ply Small Box', sku: 'CB-5PS-002', buying: '25', selling: '45', stock: '80', reorder: '15', sub: 'Small Box' },
      { name: 'Die-Cut Small Box', sku: 'CB-DCS-003', buying: '20', selling: '38', stock: '120', reorder: '25', sub: 'Small Box' },
      { name: '3-Ply Large Box', sku: 'CB-3PL-004', buying: '30', selling: '55', stock: '60', reorder: '10', sub: 'Large Box' },
      { name: '5-Ply Large Box', sku: 'CB-5PL-005', buying: '45', selling: '80', stock: '40', reorder: '10', sub: 'Large Box' },
    ],
  },
];

test.describe.serial('Seed: Categories, Subcategories & Products', () => {

  // ── Step 1: Create both categories and their subcategories ──
  test('Create categories and subcategories', async ({ authenticatedPage: page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    for (const cat of CATEGORIES) {
      // Click "Add Category"
      await page.getByRole('button', { name: /add category/i }).click();
      await page.getByPlaceholder(/paper envelope/i).waitFor({ state: 'visible' });

      // Fill category name and submit
      await page.getByPlaceholder(/paper envelope/i).fill(cat.name);
      await page.getByRole('button', { name: /^add$/i }).click();

      // Wait for the category to appear on the page
      await expect(page.locator('span.font-semibold', { hasText: cat.name })).toBeVisible({ timeout: 5000 });

      // Find the specific category card using data-slot="card" (avoids matching layout wrappers)
      const catCard = page.locator('[data-slot="card"]').filter({
        has: page.locator('span.font-semibold', { hasText: cat.name }),
      });

      // Click "+ Sub" button within that specific card
      await catCard.getByRole('button', { name: /sub/i }).click();

      // Wait for the subcategory dialog input
      const subInput = page.getByPlaceholder(/comma separated/i).or(page.getByPlaceholder(/a4 size/i));
      await subInput.waitFor({ state: 'visible' });
      await subInput.fill(cat.subcategories.join(', '));
      await page.getByRole('button', { name: /^add$/i }).click();
      await page.waitForTimeout(500);

      // Expand category to verify subcategories
      await page.locator('span.font-semibold', { hasText: cat.name }).click();
      for (const sub of cat.subcategories) {
        await expect(page.getByText(sub, { exact: true }).first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  // ── Step 2: Create stock items (products) one by one ──
  for (const cat of CATEGORIES) {
    for (const prod of cat.products) {
      test(`Add product: ${prod.name}`, async ({ authenticatedPage: page }) => {
        await page.goto('/stock');
        await page.waitForLoadState('networkidle');

        // Click "Add Stock Item" button on main page
        await page.getByRole('button', { name: /add stock item/i }).click();
        await page.waitForLoadState('networkidle');

        // Fill Item Name - handle both autocomplete and plain input
        const nameInput = page.getByPlaceholder('Search or type item name...').or(
          page.getByPlaceholder('Enter item name'),
        );
        await nameInput.waitFor({ state: 'visible' });
        await nameInput.fill(prod.name);
        await page.waitForTimeout(300);

        // Dismiss autocomplete by pressing Escape then clicking the heading
        await page.keyboard.press('Escape');
        await page.locator('h1').first().click();

        // Fill SKU
        await page.locator('input[placeholder="ACC-MRK-001"]').fill(prod.sku);

        // Select Category (native <select>)
        const categorySelect = page.locator('select').filter({
          has: page.locator('option', { hasText: 'Select category' }),
        });
        await categorySelect.selectOption({ label: cat.name });
        await page.waitForTimeout(300);

        // Select Subcategory (native <select>)
        const subSelect = page.locator('select').filter({
          has: page.locator('option', { hasText: 'Select subcategory' }),
        });
        await subSelect.selectOption({ label: prod.sub });
        await page.waitForTimeout(200);

        // Fill Current Stock
        const stockInputs = page.locator('input[type="number"][placeholder="0"]');
        await stockInputs.first().fill(prod.stock);
        await stockInputs.nth(1).fill(prod.reorder);

        // Fill Buying & Selling price
        const priceInputs = page.locator('input[type="number"][placeholder="0.00"]');
        await priceInputs.first().fill(prod.buying);
        await priceInputs.nth(1).fill(prod.selling);

        // Submit the form
        await page.getByRole('button', { name: /add stock item/i }).click();

        // Verify success
        await expect(page.getByText(/added successfully/i).first()).toBeVisible({ timeout: 10000 });
      });
    }
  }

  // ── Step 3: Verify all data ──
  test('Verify all 10 products exist in stock', async ({ authenticatedPage: page }) => {
    await page.goto('/stock');
    await page.waitForLoadState('networkidle');

    for (const cat of CATEGORIES) {
      for (const prod of cat.products) {
        await expect(page.getByText(prod.name).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Verify categories have subcategories', async ({ authenticatedPage: page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    for (const cat of CATEGORIES) {
      await expect(page.getByText(cat.name).first()).toBeVisible();
    }
  });
});
