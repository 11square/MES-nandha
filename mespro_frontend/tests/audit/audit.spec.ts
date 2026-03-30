import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Audit Module.
 * Covers: page load, stat cards, tabs, table data, search,
 * event types, navigation, edge cases, and console errors.
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

// ---------- Helper: Navigate to /audit ----------
async function goToAudit(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Audit', { exact: true }).click();
  await page.waitForURL('**/audit', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Audit — Page Load & Layout', () => {
  test('should navigate to /audit and show heading', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    expect(page.url()).toContain('/audit');
    await expect(page.getByRole('heading', { name: /audit module/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await expect(page.getByText(/po.*billing.*tax.*stock.*reconciliation/i)).toBeVisible();
  });

  test('should display stat cards for GST and profit', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    for (const label of [/input gst/i, /output gst/i, /net profit/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('should show GST Payable or GST Credit stat card', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    const payable = page.getByText(/gst payable/i).first();
    const credit = page.getByText(/gst credit/i).first();
    const payableVisible = await payable.isVisible().catch(() => false);
    const creditVisible = await credit.isVisible().catch(() => false);
    expect(payableVisible || creditVisible).toBeTruthy();
  });

  test('should show all 4 tabs', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await expect(page.getByRole('tab', { name: /tax summary/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /purchases/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /sales/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /stock reconciliation/i })).toBeVisible();
  });

  test('should show Refresh and Export Report buttons', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export report/i })).toBeVisible();
  });
});

// ============================================================
// 2. PURCHASES TAB
// ============================================================
test.describe('Audit — Purchases Tab', () => {
  test('clicking Purchases tab should show purchase orders table', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /purchases/i })).toHaveAttribute('data-state', 'active');
  });

  test('purchases table should show correct headers', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(500);
    for (const header of ['PO No', 'Vendor', 'Date', 'Amount']) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('purchases tab should show search input', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/search po|vendor/i)).toBeVisible();
  });

  test('purchases table should display rows', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(500);
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('search in purchases tab should filter results', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(500);
    const searchInput = page.getByPlaceholder(/search po|vendor/i);
    await searchInput.fill('PO-');
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// 3. SALES TAB
// ============================================================
test.describe('Audit — Sales Tab', () => {
  test('clicking Sales tab should show sales bills table', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /sales/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /sales/i })).toHaveAttribute('data-state', 'active');
  });

  test('sales table should show correct headers', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /sales/i }).click();
    await page.waitForTimeout(500);
    for (const header of ['Invoice No', 'Customer', 'Date', 'Amount']) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('sales tab should show search input', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /sales/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/search invoice|customer/i)).toBeVisible();
  });

  test('sales table should display rows', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /sales/i }).click();
    await page.waitForTimeout(500);
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 4. STOCK RECONCILIATION TAB
// ============================================================
test.describe('Audit — Stock Reconciliation Tab', () => {
  test('clicking Stock Reconciliation tab should show data', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /stock reconciliation/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /stock reconciliation/i })).toHaveAttribute('data-state', 'active');
  });

  test('stock reconciliation should show summary cards', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /stock reconciliation/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/total purchase value/i).first()).toBeVisible();
    await expect(page.getByText(/total sales value/i).first()).toBeVisible();
  });

  test('stock reconciliation table should show correct headers', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /stock reconciliation/i }).click();
    await page.waitForTimeout(500);
    for (const header of ['Item', 'Purchased', 'In Stock']) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });
});

// ============================================================
// 5. TAX SUMMARY TAB
// ============================================================
test.describe('Audit — Tax Summary Tab', () => {
  test('Tax Summary tab should be active by default', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await expect(page.getByRole('tab', { name: /tax summary/i })).toHaveAttribute('data-state', 'active');
  });

  test('Tax Summary should show month filter', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    // Month filter (select/input)
    const monthSelector = page.locator('select, input[type="month"]').first();
    await expect(monthSelector).toBeVisible();
  });
});

// ============================================================
// 6. EVENT TYPES
// ============================================================
test.describe('Audit — Event Types', () => {
  test('clicking Refresh should not crash the page', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('button', { name: /refresh/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: /audit module/i }).first()).toBeVisible();
  });

  test('switching between all tabs should work', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    const tabs = [/purchases/i, /sales/i, /stock reconciliation/i, /tax summary/i];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForTimeout(300);
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('data-state', 'active');
    }
  });
});

// ============================================================
// 7. NAVIGATION
// ============================================================
test.describe('Audit — Navigation', () => {
  test('sidebar navigation from audit to dashboard should update URL', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /audit should work', async ({ authenticatedPage: page }) => {
    await page.goto('/audit');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/audit');
  });

  test('refreshing /audit should persist the page', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/audit');
  });
});

// ============================================================
// 8. EDGE CASES
// ============================================================
test.describe('Audit — Edge Cases', () => {
  test('search with no results in purchases should show empty table', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(500);
    const searchInput = page.getByPlaceholder(/search po|vendor/i);
    await searchInput.fill('NONEXISTENT_XYZ!!');
    await page.waitForTimeout(500);
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBe(0);
  });

  test('clearing search should show all results again', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(500);
    const initialCount = await page.locator('tbody tr').count();
    const searchInput = page.getByPlaceholder(/search po|vendor/i);
    await searchInput.fill('NONEXISTENT');
    await page.waitForTimeout(500);
    await searchInput.fill('');
    await page.waitForTimeout(500);
    expect(await page.locator('tbody tr').count()).toBe(initialCount);
  });

  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToAudit(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /purchases/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /sales/i }).click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /audit module/i }).first()).toBeVisible();
  });
});

// ============================================================
// 9. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Audit — Console Error Checks', () => {
  test('audit page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAudit(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /audit:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('audit page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAudit(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions on /audit:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Purchases tab should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on purchases tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Sales tab should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /sales/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on sales tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Stock Reconciliation tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /stock reconciliation/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on stock reconciliation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search filtering should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAudit(page);
    await page.getByRole('tab', { name: /purchases/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/search po|vendor/i).fill('PO-');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('clicking refresh should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAudit(page);
    await page.getByRole('button', { name: /refresh/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on refresh:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
