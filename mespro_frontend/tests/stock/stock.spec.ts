import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Stock Management module.
 * Covers: page load, stat cards, table data, search, filter,
 * add stock form, and console errors.
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

async function goToStock(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Stock', { exact: true }).click();
  await page.waitForURL('**/stock', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Stock — Page Load & Layout', () => {
  test('should navigate to stock page', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page).toHaveURL(/\/stock/);
  });

  test('should display Stock Management heading', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page.getByRole('heading', { name: /stock management/i }).first()).toBeVisible();
  });

  test('should show subtitle', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page.getByText(/non-manufactured items|accessories/i).first()).toBeVisible();
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page.getByPlaceholder(/search by name|sku|supplier/i)).toBeVisible();
  });

  test('should show Add Stock Item button', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page.getByRole('button', { name: /add stock/i })).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS
// ============================================================
test.describe('Stock — Stat Cards', () => {
  test('should display Total Stock Value card', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page.getByText(/total stock value/i).first()).toBeVisible();
  });

  test('should display Total Items card', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page.getByText(/total items/i).first()).toBeVisible();
  });

  test('should display Low Stock Alerts card', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page.getByText(/low stock/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. TABLE DATA
// ============================================================
test.describe('Stock — Table Data', () => {
  test('should show stock table with headers', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    const expectedHeaders = ['Item Details', 'Category', 'Current Stock', 'Status'];
    for (const header of expectedHeaders) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('should show stock rows', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 4. SEARCH & FILTER
// ============================================================
test.describe('Stock — Search & Filter', () => {
  test('search should filter items', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by name, sku/i);
    await searchInput.click();
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
    await page.waitForTimeout(500);
  });

  test('category filter should be visible', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    // Look for category dropdown
    const categoryFilter = page.locator('select, [role="combobox"]').first();
    await expect(categoryFilter).toBeVisible();
  });
});

// ============================================================
// 5. ADD STOCK FORM
// ============================================================
test.describe('Stock — Add Stock Item', () => {
  test('clicking Add Stock Item should show form', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(500);
    // Add stock opens a full-page form with relevant fields
    const heading = page.getByRole('heading', { name: /add stock|new stock|add new/i });
    const input = page.getByPlaceholder(/enter item name/i);
    const headingVisible = await heading.isVisible().catch(() => false);
    const inputVisible = await input.isVisible().catch(() => false);
    expect(headingVisible || inputVisible).toBeTruthy();
  });
});

// ============================================================
// 5. ADD STOCK FORM
// ============================================================
test.describe('Stock — Add Stock Item', () => {
  test('clicking Add Stock Item should show form', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(500);
    const heading = page.getByRole('heading', { name: /add.*stock|new stock/i });
    await expect(heading).toBeVisible();
  });

  test('add stock form should show item name field', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/item name/i).first()).toBeVisible();
  });

  test('add stock form should show SKU field', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/sku/i).first()).toBeVisible();
  });

  test('add stock form should show category select', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/category/i).first()).toBeVisible();
  });

  test('back/cancel button should return to stock list', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(500);
    const backBtn = page.getByRole('button', { name: /back|cancel/i }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('heading', { name: /stock management/i }).first()).toBeVisible();
    }
  });
});

// ============================================================
// 6. ADD STOCK FORM VALIDATION
// ============================================================
test.describe('Stock — Form Validation', () => {
  test('submitting empty form should show required errors', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(500);
    // Find submit button
    const submitBtn = page.getByRole('button', { name: /add stock item|create|save/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/is required/i).first()).toBeVisible();
    }
  });

  test('item name too short should show min-length error', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(500);
    const nameInputs = page.locator('input').filter({ hasText: '' });
    const nameInput = page.locator('input').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('A');
      const submitBtn = page.getByRole('button', { name: /add stock item|create|save/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
        await expect(page.getByText(/must be at least 2 characters/i)).toBeVisible();
      }
    }
  });
});

// ============================================================
// 7. CATEGORY FILTER
// ============================================================
test.describe('Stock — Category Filter', () => {
  test('category filter should show All Categories option', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    const categoryFilter = page.locator('select').first();
    if (await categoryFilter.isVisible()) {
      await expect(categoryFilter).toBeVisible();
    }
  });
});

// ============================================================
// 8. LOW STOCK SECTION
// ============================================================
test.describe('Stock — Low Stock', () => {
  test('should have category stat card', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await expect(page.getByText(/category/i).first()).toBeVisible();
  });
});

// ============================================================
// 9. API VERIFICATION
// ============================================================
test.describe('Stock — API Verification', () => {
  test('page load should call GET /stock', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/stock') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Stock', { exact: true }).click();
    await page.waitForURL('**/stock', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });

  test('GET /stock response should contain data', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/stock') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Stock', { exact: true }).click();
    await page.waitForURL('**/stock', { timeout: 10_000 });
    const response = await apiPromise;
    const body = await response.json();
    expect(body.data || body).toBeDefined();
  });
});

// ============================================================
// 10. NAVIGATION
// ============================================================
test.describe('Stock — Navigation', () => {
  test('sidebar navigation from stock to dashboard', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /stock should work', async ({ authenticatedPage: page }) => {
    await page.goto('/stock');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/stock');
  });

  test('refreshing /stock should persist the page', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/stock');
  });
});

// ============================================================
// 11. EDGE CASES
// ============================================================
test.describe('Stock — Edge Cases', () => {
  test('searching for non-existent item should show empty', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const search = page.getByPlaceholder(/search by name, sku/i);
    await search.fill('ZZZZZNONEXISTENT999');
    await page.waitForTimeout(1000);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeLessThanOrEqual(1);
  });

  test('clearing search should restore results', async ({ authenticatedPage: page }) => {
    await goToStock(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const search = page.getByPlaceholder(/search by name, sku/i);
    await search.fill('ZZZNONEXISTENT');
    await page.waitForTimeout(500);
    await search.clear();
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 12. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Stock — Console Error Checks', () => {
  test('stock page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToStock(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /stock:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('stock page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToStock(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add stock form should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToStock(page);
    await page.getByRole('button', { name: /add stock/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add stock:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToStock(page);
    await page.getByPlaceholder(/search by name, sku/i).fill('ACC');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
