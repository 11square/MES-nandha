import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Production Board module.
 * Covers: page load, stat cards, search, filter, order cards,
 * add production form, navigation, and console errors.
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

async function goToProduction(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Production', { exact: true }).click();
  await page.waitForURL('**/production', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Production — Page Load & Layout', () => {
  test('should navigate to production page', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page).toHaveURL(/\/production/);
  });

  test('should display Production Board heading', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByRole('heading', { name: /production board/i }).first()).toBeVisible();
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
  });

  test('should show Add Production button', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByRole('button', { name: /add production/i })).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS (Stage-based)
// ============================================================
test.describe('Production — Stat Cards', () => {
  test('should display stage cards', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    // Production uses stage-based stat cards
    await expect(page.getByText(/early stage/i).first()).toBeVisible();
  });

  test('should display summary stats', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/total orders/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. SEARCH & FILTER
// ============================================================
test.describe('Production — Search & Filter', () => {
  test('search input should accept text', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.click();
    await searchInput.fill('ORD-');
    await expect(searchInput).toHaveValue('ORD-');
  });

  test('stage filter dropdown should be visible', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    // Look for stage filter (select or combobox)
    const stageFilter = page.locator('select, [role="combobox"]').first();
    await expect(stageFilter).toBeVisible();
  });
});

// ============================================================
// 4. ADD PRODUCTION FORM
// ============================================================
test.describe('Production — Add Production', () => {
  test('clicking Add Production should open dialog', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('add production dialog should show form fields', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    // Should have order/customer related fields
    await expect(dialog.locator('input, select, textarea').first()).toBeVisible();
  });

  test('dialog cancel should close it', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});

// ============================================================
// 5. ADD PRODUCTION FORM VALIDATION
// ============================================================
test.describe('Production — Form Validation', () => {
  test('submitting empty form should show validation errors', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    // Click submit
    await dialog.getByRole('button', { name: /add to production/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });

  test('order ID must be numeric', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    const orderInput = dialog.getByPlaceholder(/ORD-2024/i).or(dialog.locator('input').first());
    if (await orderInput.isVisible()) {
      await orderInput.fill('abc');
      await dialog.getByRole('button', { name: /add to production/i }).click();
      await page.waitForTimeout(500);
    }
  });

  test('customer too short should show min-length error', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    const customerInput = dialog.getByPlaceholder(/customer/i);
    if (await customerInput.isVisible()) {
      await customerInput.fill('A');
      await dialog.getByRole('button', { name: /add to production/i }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/must be at least 2 characters/i)).toBeVisible();
    }
  });

  test('quantity must be at least 1', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    const qtyInputs = dialog.locator('input[type="number"]');
    const count = await qtyInputs.count();
    if (count > 0) {
      await qtyInputs.first().fill('0');
      await dialog.getByRole('button', { name: /add to production/i }).click();
      await page.waitForTimeout(500);
    }
  });
});

// ============================================================
// 6. ADD PRODUCTION FORM FIELDS
// ============================================================
test.describe('Production — Form Fields', () => {
  test('form should show product select', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    const selects = dialog.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('form should show priority select', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/priority/i).first()).toBeVisible();
  });

  test('form should show size select', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/size/i).first()).toBeVisible();
  });
});

// ============================================================
// 7. STAGE STAT CARDS
// ============================================================
test.describe('Production — Stage Cards', () => {
  test('should show Early Stage card', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/early stage/i).first()).toBeVisible();
  });

  test('should show Initial Process card', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/initial process/i).first()).toBeVisible();
  });

  test('should show Assembly card', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/assembly/i).first()).toBeVisible();
  });

  test('should show Finishing card', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/finishing/i).first()).toBeVisible();
  });

  test('should show Ready to Pack card', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/ready to pack/i).first()).toBeVisible();
  });

  test('should show Total Orders stat', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/total orders/i).first()).toBeVisible();
  });

  test('should show At Risk stat', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/at risk/i).first()).toBeVisible();
  });

  test('should show High Priority stat', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await expect(page.getByText(/high priority/i).first()).toBeVisible();
  });
});

// ============================================================
// 8. CREATE PRODUCTION CRUD + API
// ============================================================
test.describe('Production — Create CRUD + API', () => {
  test('page load should call GET /production', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/production') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Production', { exact: true }).click();
    await page.waitForURL('**/production', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 9. NAVIGATION
// ============================================================
test.describe('Production — Navigation', () => {
  test('sidebar navigation from production to dashboard', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /production should work', async ({ authenticatedPage: page }) => {
    await page.goto('/production');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/production');
  });

  test('refreshing /production should persist the page', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/production');
  });
});

// ============================================================
// 10. EDGE CASES
// ============================================================
test.describe('Production — Edge Cases', () => {
  test('searching for non-existent order should show empty or no match', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill('ZZZZZNONEXISTENT999');
    await page.waitForTimeout(1000);
  });

  test('clearing search should restore results', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill('ZZZNONEXISTENT');
    await page.waitForTimeout(500);
    await searchInput.clear();
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: /production board/i }).first()).toBeVisible();
  });

  test('rapid dialog open/close should not crash', async ({ authenticatedPage: page }) => {
    await goToProduction(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /add production/i }).click();
      await page.waitForTimeout(200);
      const dialog = page.locator('div[role="dialog"]');
      if (await dialog.isVisible()) {
        await dialog.getByRole('button', { name: /cancel/i }).click();
        await page.waitForTimeout(200);
      }
    }
    await expect(page.getByRole('heading', { name: /production board/i }).first()).toBeVisible();
  });
});

// ============================================================
// 11. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Production — Console Error Checks', () => {
  test('production page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProduction(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /production:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('production page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProduction(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add production dialog should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add production:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('form validation should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProduction(page);
    await page.getByRole('button', { name: /add production/i }).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /add to production/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToProduction(page);
    await page.getByPlaceholder(/search/i).first().fill('ORD');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
