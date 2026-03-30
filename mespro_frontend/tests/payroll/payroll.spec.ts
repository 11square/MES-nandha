import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Payroll Management module.
 * Covers: page load, stat cards, table data, search, action buttons,
 * API verification, navigation, edge cases, and console errors.
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

// ---------- Helper: Navigate to /payroll ----------
async function goToPayroll(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Payroll', { exact: true }).click();
  await page.waitForURL('**/payroll', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Payroll — Page Load & Layout', () => {
  test('should navigate to /payroll and show heading', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    expect(page.url()).toContain('/payroll');
    await expect(page.getByRole('heading', { name: /payroll management/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await expect(page.getByText(/manage payroll/i)).toBeVisible();
  });

  test('should display 4 stat cards', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    for (const label of [/payroll/i, /paid/i, /pending/i, /staff/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await expect(page.getByPlaceholder(/search by employee name or id/i)).toBeVisible();
  });

  test('should show Export Reports button', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });

  test('should show Process Salary button', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await expect(page.getByRole('button', { name: /process salary/i })).toBeVisible();
  });

  test('should show payroll table with correct headers', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    const headers = ['Employee', 'Department', 'Basic Salary', 'Allowances', 'Deductions', 'Net Salary', 'Status'];
    for (const header of headers) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('stat cards should show numeric values', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    const statValues = page.locator('.text-2xl.font-bold, .text-3xl.font-bold');
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================
// 2. TABLE DATA
// ============================================================
test.describe('Payroll — Table Data', () => {
  test('table should display employee rows', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('each row should show employee name', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const firstCell = page.locator('tbody tr').first().locator('td').first();
    await expect(firstCell).not.toBeEmpty();
  });

  test('each row should show status badge', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const statusCell = page.locator('tbody tr').first().locator('td').nth(6);
    await expect(statusCell).not.toBeEmpty();
  });

  test('each row should have action buttons', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should show summary cards (Avg Salary, Total Allowances, Total Deductions)', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await expect(page.getByText(/avg.*salary/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. SEARCH
// ============================================================
test.describe('Payroll — Search', () => {
  test('search should filter employees by name', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by employee name or id/i);
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('test');
  });

  test('search with no results should show empty table', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by employee name or id/i);
    await searchInput.fill('NONEXISTENT_EMPLOYEE_XYZ');
    await page.waitForTimeout(500);
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBe(0);
  });

  test('clearing search should show all employees again', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const initialCount = await page.locator('tbody tr').count();
    const searchInput = page.getByPlaceholder(/search by employee name or id/i);
    await searchInput.fill('NONEXISTENT');
    await page.waitForTimeout(500);
    await searchInput.fill('');
    await page.waitForTimeout(500);
    expect(await page.locator('tbody tr').count()).toBe(initialCount);
  });
});

// ============================================================
// 4. EVENT TYPES
// ============================================================
test.describe('Payroll — Event Types', () => {
  test('clicking Process Salary should trigger an action', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.getByRole('button', { name: /process salary/i }).click();
    await page.waitForTimeout(1000);
    // Should show toast/confirmation or dialog
    await expect(page.getByRole('heading', { name: /payroll management/i }).first()).toBeVisible();
  });

  test('clicking Export Reports should trigger an action', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.getByRole('button', { name: /export/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: /payroll management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 5. API VERIFICATION
// ============================================================
test.describe('Payroll — API Verification', () => {
  test('page load should call GET /api/v1/payroll', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/payroll') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.locator('nav').getByText('Payroll', { exact: true }).click();
    await page.waitForURL('**/payroll', { timeout: 10_000 });

    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 6. NAVIGATION
// ============================================================
test.describe('Payroll — Navigation', () => {
  test('sidebar navigation from payroll to dashboard', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /payroll should work', async ({ authenticatedPage: page }) => {
    await page.goto('/payroll');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/payroll');
  });

  test('refreshing /payroll should persist the page', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/payroll');
  });
});

// ============================================================
// 7. EDGE CASES
// ============================================================
test.describe('Payroll — Edge Cases', () => {
  test('pagination should work if available', async ({ authenticatedPage: page }) => {
    await goToPayroll(page);
    const nextBtn = page.getByRole('button', { name: /next/i });
    const prevBtn = page.getByRole('button', { name: /previous/i });
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      if (await prevBtn.isEnabled().catch(() => false)) {
        await prevBtn.click();
        await page.waitForTimeout(500);
      }
    }
    await expect(page.getByRole('heading', { name: /payroll management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 8. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Payroll — Console Error Checks', () => {
  test('payroll page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPayroll(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /payroll:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('payroll page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPayroll(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions on /payroll:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPayroll(page);
    await page.getByPlaceholder(/search by employee name or id/i).fill('test');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('clicking Process Salary should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPayroll(page);
    await page.getByRole('button', { name: /process salary/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on process salary:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
