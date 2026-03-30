import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Finance Management module.
 * Covers: page load, stat cards, tabs, table data, form validation,
 * CRUD operations, API verification, navigation, edge cases, and console errors.
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

// ---------- Helper: Navigate to /finance ----------
async function goToFinance(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Finance', { exact: true }).click();
  await page.waitForURL('**/finance', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ---------- Helper: Open Add Transaction Dialog ----------
async function openAddTransaction(page: import('@playwright/test').Page) {
  await goToFinance(page);
  await page.getByRole('button', { name: /add transaction/i }).click();
  await expect(page.locator('div[role="dialog"]')).toBeVisible();
}

// ---------- Helper: Open Add Receipt Dialog ----------
async function openAddReceipt(page: import('@playwright/test').Page) {
  await goToFinance(page);
  await page.getByRole('tab', { name: /receipts/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /add receipt/i }).click();
  await expect(page.locator('div[role="dialog"]')).toBeVisible();
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Finance — Page Load & Layout', () => {
  test('should navigate to /finance and show heading', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    expect(page.url()).toContain('/finance');
    await expect(page.getByRole('heading', { name: /finance management/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await expect(page.getByText(/manage payments and transactions/i)).toBeVisible();
  });

  test('should display 4 stat cards', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    for (const label of [/total income/i, /total expenses/i, /pending payments/i, /overdue/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('should show Transactions and Receipts tabs', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await expect(page.getByRole('tab', { name: /transactions/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /receipts/i })).toBeVisible();
  });

  test('should show Add Transaction button', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await expect(page.getByRole('button', { name: /add transaction/i })).toBeVisible();
  });

  test('should show transactions table with correct headers', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Reference', 'Status'];
    for (const header of headers) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('stat cards should show numeric values', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    const statValues = page.locator('.text-2xl.font-bold, .text-3xl.font-bold');
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================
// 2. TRANSACTION FORM VALIDATION
// ============================================================
test.describe('Finance — Transaction Form Validation', () => {
  test('submitting empty transaction form should show required-field errors', async ({ authenticatedPage: page }) => {
    await openAddTransaction(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /add transaction/i }).click();

    await expect(page.getByText('Date is required')).toBeVisible();
    await expect(page.getByText('Type is required')).toBeVisible();
    await expect(page.getByText('Category is required')).toBeVisible();
    await expect(page.getByText('Amount is required')).toBeVisible();
    await expect(page.getByText('Description is required')).toBeVisible();
  });

  test('amount with negative value should show min error', async ({ authenticatedPage: page }) => {
    await openAddTransaction(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#amount, input[type="number"]').first().fill('-10');
    await dialog.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByText(/amount must be at least 0/i)).toBeVisible();
  });

  test('cancel button should close transaction dialog', async ({ authenticatedPage: page }) => {
    await openAddTransaction(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});

// ============================================================
// 3. RECEIPT FORM VALIDATION
// ============================================================
test.describe('Finance — Receipt Form Validation', () => {
  test('submitting empty receipt form should show required-field errors', async ({ authenticatedPage: page }) => {
    await openAddReceipt(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /add receipt/i }).click();

    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });

  test('cancel button should close receipt dialog', async ({ authenticatedPage: page }) => {
    await openAddReceipt(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});

// ============================================================
// 4. CREATE TRANSACTION (CRUD + API)
// ============================================================
test.describe('Finance — Create Transaction (CRUD + API)', () => {
  test('should create a transaction via form and verify API call', async ({ authenticatedPage: page }) => {
    const createPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/finance/transactions') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );

    await openAddTransaction(page);
    const dialog = page.locator('div[role="dialog"]');

    // Fill required fields
    await dialog.locator('input[type="date"]').first().fill('2024-06-15');
    await dialog.locator('select').first().selectOption({ index: 1 }); // type
    await dialog.locator('select').nth(1).selectOption({ index: 1 }); // category
    await dialog.locator('input[type="number"]').first().fill('5000');
    await dialog.locator('textarea, input[placeholder]').last().fill('Test transaction');

    await dialog.getByRole('button', { name: /add transaction/i }).click();

    const response = await createPromise;
    expect(response.status()).toBeLessThan(400);
  });
});

// ============================================================
// 5. READ & TABLE DATA ACCURACY
// ============================================================
test.describe('Finance — Read & Table Data', () => {
  test('transactions table should display rows', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('each row should show status badge', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const statusCell = page.locator('tbody tr').first().locator('td').last();
    await expect(statusCell).not.toBeEmpty();
  });

  test('receipts tab should show receipt table with rows', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.getByRole('tab', { name: /receipts/i }).click();
    await page.waitForTimeout(1000);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 6. TABS & EVENT TYPES
// ============================================================
test.describe('Finance — Event Types', () => {
  test('clicking Receipts tab should switch view', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.getByRole('tab', { name: /receipts/i }).click();
    await expect(page.getByRole('tab', { name: /receipts/i })).toHaveAttribute('data-state', 'active');
  });

  test('clicking Transactions tab should switch back', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.getByRole('tab', { name: /receipts/i }).click();
    await page.getByRole('tab', { name: /transactions/i }).click();
    await expect(page.getByRole('tab', { name: /transactions/i })).toHaveAttribute('data-state', 'active');
  });

  test('Receipts tab should show Add Receipt button', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.getByRole('tab', { name: /receipts/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /add receipt/i })).toBeVisible();
  });

  test('clicking Add Transaction should open dialog with heading', async ({ authenticatedPage: page }) => {
    await openAddTransaction(page);
    await expect(page.getByText(/add new transaction/i)).toBeVisible();
  });

  test('clicking Add Receipt should open receipt dialog', async ({ authenticatedPage: page }) => {
    await openAddReceipt(page);
    await expect(page.getByText(/add new receipt/i)).toBeVisible();
  });
});

// ============================================================
// 7. API VERIFICATION
// ============================================================
test.describe('Finance — API Verification', () => {
  test('page load should call GET /api/v1/finance endpoints', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/finance') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.locator('nav').getByText('Finance', { exact: true }).click();
    await page.waitForURL('**/finance', { timeout: 10_000 });

    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 8. NAVIGATION
// ============================================================
test.describe('Finance — Navigation', () => {
  test('sidebar navigation from finance to dashboard should update URL', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /finance should work when authenticated', async ({ authenticatedPage: page }) => {
    await page.goto('/finance');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/finance');
  });

  test('refreshing /finance should persist the page', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/finance');
  });
});

// ============================================================
// 9. EDGE CASES
// ============================================================
test.describe('Finance — Edge Cases', () => {
  test('opening and closing transaction dialog multiple times should work', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /add transaction/i }).click();
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
      await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
      await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
    }
  });

  test('switching tabs rapidly should not crash', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /receipts/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('tab', { name: /transactions/i }).click();
      await page.waitForTimeout(200);
    }
    await expect(page.getByRole('heading', { name: /finance management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 10. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Finance — Console Error Checks', () => {
  test('finance page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToFinance(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /finance:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('finance page load should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToFinance(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions on /finance:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add transaction dialog should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddTransaction(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add transaction:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('submitting invalid form should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddTransaction(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /add transaction/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on form validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching tabs should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToFinance(page);
    await page.getByRole('tab', { name: /receipts/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /transactions/i }).click();
    await page.waitForTimeout(500);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during tab switch:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening receipt dialog should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddReceipt(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add receipt:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
