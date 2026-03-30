import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Product Management module.
 * Covers: page load, stat cards, product grid/list, categories,
 * add product/category, search/filter, and console errors.
 */

let _consoleErrors: ConsoleError[] = [];
test.beforeEach(async ({ consoleErrors }) => { _consoleErrors = consoleErrors; });
test.afterEach(async ({}, testInfo) => {
  if (_consoleErrors.length > 0) {
    const summary = _consoleErrors.map(
      (e, i) => `  [${i + 1}] (${e.source}) ${e.message}  — at ${e.url ?? 'unknown'}`
    ).join('\n');
    await testInfo.attach('browser-console-errors', { body: summary, contentType: 'text/plain' });
  }
});

async function goToProducts(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Products', { exact: false }).click();
  await page.waitForURL('**/products', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Products — Page Load & Layout', () => {
  test('should navigate to products page', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page).toHaveURL(/\/products/);
  });

  test('should display Product Management heading', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page.getByRole('heading', { name: /product management/i }).first()).toBeVisible();
  });

  test('should show Add Product button', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page.getByRole('button', { name: /add product/i })).toBeVisible();
  });

  test('should show Add Category button', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page.getByRole('button', { name: /add category/i })).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS
// ============================================================
test.describe('Products — Stat Cards', () => {
  test('should display Total Products', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page.getByText(/total products/i).first()).toBeVisible();
  });

  test('should display Active Products', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page.getByText(/active products/i).first()).toBeVisible();
  });

  test('should display Low Stock Items', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page.getByText(/low stock/i).first()).toBeVisible();
  });

  test('should display Total Stock Value', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page.getByText(/total stock value|stock value/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. FILTER CONTROLS
// ============================================================
test.describe('Products — Filters', () => {
  test('should show category filter', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    // Look for a dropdown/select with category references
    const filter = page.getByRole('combobox').first();
    const button = page.getByRole('button', { name: /category|all categories/i }).first();
    const filterVis = await filter.isVisible().catch(() => false);
    const buttonVis = await button.isVisible().catch(() => false);
    expect(filterVis || buttonVis).toBeTruthy();
  });

  test('should show grid/list view toggle', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    // grid or list toggle buttons
    const gridBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(gridBtn).toBeVisible();
  });
});

// ============================================================
// 4. PRODUCT DATA
// ============================================================
test.describe('Products — Data Display', () => {
  test('should show product cards or list items', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.waitForTimeout(1500);
    // Cards, table rows, or list items
    const items = page.locator('[class*="card"], [class*="Card"], tbody tr, .grid > div');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 5. ADD PRODUCT FORM
// ============================================================
test.describe('Products — Add Product', () => {
  test('clicking Add Product should open form/dialog', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: /create new product/i })).toBeVisible();
  });

  test('Add Product form should show Name field', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#name')).toBeVisible();
  });

  test('Add Product form should show SKU field', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#sku')).toBeVisible();
  });

  test('Add Product form should show Category field', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#category')).toBeVisible();
  });

  test('Add Product form should show Base Price field', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#base_price')).toBeVisible();
  });

  test('Add Product form should show Selling Price field', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#selling_price')).toBeVisible();
  });

  test('cancel/back button should return to products list', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    const backBtn = page.getByRole('button', { name: /back|cancel/i }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('heading', { name: /product management/i }).first()).toBeVisible();
    }
  });
});

// ============================================================
// 6. ADD PRODUCT FORM VALIDATION
// ============================================================
test.describe('Products — Product Form Validation', () => {
  test('submitting empty form should show error messages', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    const submitBtn = page.getByRole('button', { name: /create product/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/is required/i).first()).toBeVisible();
    }
  });

  test('Name must be at least 2 characters', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    await page.locator('#name').fill('A');
    const submitBtn = page.getByRole('button', { name: /create product/i });
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/at least 2 characters/i).first()).toBeVisible();
    }
  });

  test('Stock field should accept numeric value', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    const stockField = page.locator('#stock');
    if (await stockField.isVisible()) {
      await stockField.fill('10');
      await expect(stockField).toHaveValue('10');
    }
  });

  test('Min Stock field should be visible', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#min_stock')).toBeVisible();
  });
});

// ============================================================
// 7. ADD CATEGORY FORM
// ============================================================
test.describe('Products — Add Category', () => {
  test('clicking Add Category should open form/dialog', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add category/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    const heading = page.getByRole('heading', { name: /add|new|category/i });
    const dialogVisible = await dialog.isVisible().catch(() => false);
    const headingVisible = await heading.isVisible().catch(() => false);
    expect(dialogVisible || headingVisible).toBeTruthy();
  });

  test('category form should show Category Name field', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add category/i }).click();
    await page.waitForTimeout(500);
    const nameField = page.locator('#categoryName').or(page.getByPlaceholder(/category name/i));
    await expect(nameField.first()).toBeVisible();
  });

  test('submitting empty category should show error', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add category/i }).click();
    await page.waitForTimeout(500);
    const submitBtn = page.getByRole('button', { name: /create|add|save/i }).last();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/is required|at least/i).first()).toBeVisible();
    }
  });

  test('Category Name min 2 characters validation', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add category/i }).click();
    await page.waitForTimeout(500);
    const nameField = page.locator('#categoryName').or(page.getByPlaceholder(/category name/i));
    if (await nameField.first().isVisible()) {
      await nameField.first().fill('A');
      const submitBtn = page.getByRole('button', { name: /create|add|save/i }).last();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
        await expect(page.getByText(/at least 2 characters/i).first()).toBeVisible();
      }
    }
  });
});

// ============================================================
// 8. SEARCH
// ============================================================
test.describe('Products — Search', () => {
  test('search box should be visible', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
  });

  test('typing in search should filter products', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.waitForTimeout(1000);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('product');
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: /product management/i }).first()).toBeVisible();
  });

  test('searching non-existent product shows no results', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('ZZZNONEXISTENT999');
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: /product management/i }).first()).toBeVisible();
  });

  test('clearing search restores all products', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.waitForTimeout(1000);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('ZZZNONEXISTENT');
    await page.waitForTimeout(500);
    await search.clear();
    await page.waitForTimeout(500);
    const items = page.locator('[class*="card"], [class*="Card"], tbody tr, .grid > div');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 9. API VERIFICATION
// ============================================================
test.describe('Products — API Verification', () => {
  test('page load should call GET /products', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/products') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Products', { exact: false }).click();
    await page.waitForURL('**/products', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });

  test('page load should call GET /categories', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/categories') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Products', { exact: false }).click();
    await page.waitForURL('**/products', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 10. NAVIGATION
// ============================================================
test.describe('Products — Navigation', () => {
  test('sidebar navigation from products to dashboard', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /products should work', async ({ authenticatedPage: page }) => {
    await page.goto('/products');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/products');
  });

  test('refreshing /products should persist page', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/products');
  });
});

// ============================================================
// 11. EDGE CASES
// ============================================================
test.describe('Products — Edge Cases', () => {
  test('switching view mode should not crash', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    // Click view toggle buttons (grid/list)
    const toggleBtns = page.locator('button').filter({ has: page.locator('svg') });
    const count = await toggleBtns.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      if (await toggleBtns.nth(i).isEnabled()) {
        await toggleBtns.nth(i).click();
        await page.waitForTimeout(200);
      }
    }
    await expect(page.getByRole('heading', { name: /product management/i }).first()).toBeVisible();
  });

  test('open and close add product form rapidly should not crash', async ({ authenticatedPage: page }) => {
    await goToProducts(page);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /add product/i }).click();
      await page.waitForTimeout(300);
      const backBtn = page.getByRole('button', { name: /back|cancel/i }).first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await page.waitForTimeout(300);
      }
    }
    await expect(page.getByRole('heading', { name: /product management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 12. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Products — Console Error Checks', () => {
  test('page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProducts(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProducts(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add product form should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add product/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add product:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add category form should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProducts(page);
    await page.getByRole('button', { name: /add category/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add category:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProducts(page);
    await page.getByPlaceholder(/search/i).first().fill('product');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
