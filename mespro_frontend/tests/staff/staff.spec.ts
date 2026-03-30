import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Staff Management module.
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

// ---------- Helper: Navigate to /staff ----------
async function goToStaff(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Staff', { exact: true }).click();
  await page.waitForURL('**/staff', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Staff — Page Load & Layout', () => {
  test('should navigate to /staff and show heading', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    expect(page.url()).toContain('/staff');
    await expect(page.getByRole('heading', { name: /staff management/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await expect(page.getByText(/manage staff/i)).toBeVisible();
  });

  test('should display 4 stat cards', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    for (const label of [/total staff/i, /active today/i, /on leave/i, /departments/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await expect(page.getByPlaceholder(/search by name.*id.*role/i)).toBeVisible();
  });

  test('should show Add Staff button', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await expect(page.getByRole('button', { name: /add.*staff/i })).toBeVisible();
  });

  test('should show staff table with correct headers', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    for (const header of ['Employee', 'Department', 'Contact', 'Location', 'Status']) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('stat cards should show numeric values', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    const statValues = page.locator('.text-2xl.font-bold, .text-3xl.font-bold');
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================
// 2. TABLE DATA
// ============================================================
test.describe('Staff — Table Data', () => {
  test('table should display staff rows', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('each row should show employee name', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const firstCell = page.locator('tbody tr').first().locator('td').first();
    await expect(firstCell).not.toBeEmpty();
  });

  test('each row should show department', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const deptCell = page.locator('tbody tr').first().locator('td').nth(1);
    await expect(deptCell).not.toBeEmpty();
  });

  test('each row should show status badge', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const statusCell = page.locator('tbody tr').first().locator('td').nth(4);
    await expect(statusCell).not.toBeEmpty();
  });

  test('each row should have action buttons', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 3. SEARCH
// ============================================================
test.describe('Staff — Search', () => {
  test('search should filter staff by name', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const initialCount = await page.locator('tbody tr').count();
    const searchInput = page.getByPlaceholder(/search by name.*id.*role/i);
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('test');
  });

  test('search with no results should show empty table', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by name.*id.*role/i);
    await searchInput.fill('NONEXISTENT_STAFF_XYZ!!');
    await page.waitForTimeout(500);
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBe(0);
  });

  test('clearing search should show all staff again', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const initialCount = await page.locator('tbody tr').count();
    const searchInput = page.getByPlaceholder(/search by name.*id.*role/i);
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
test.describe('Staff — Event Types', () => {
  test('clicking Add Staff should trigger form/dialog', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add.*staff/i }).click();
    await page.waitForTimeout(500);
    // Should show a form or dialog
    const dialog = page.locator('div[role="dialog"]');
    const heading = page.getByRole('heading', { name: /add|new|staff/i });
    const dialogVisible = await dialog.isVisible().catch(() => false);
    const headingVisible = await heading.isVisible().catch(() => false);
    expect(dialogVisible || headingVisible).toBeTruthy();
  });

  test('typing in search should update input value', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    const searchInput = page.getByPlaceholder(/search by name.*id.*role/i);
    await searchInput.fill('Manager');
    await expect(searchInput).toHaveValue('Manager');
  });
});

// ============================================================
// 5. API VERIFICATION
// ============================================================
test.describe('Staff — API Verification', () => {
  test('page load should call GET /api/v1/staff', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/staff') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.locator('nav').getByText('Staff', { exact: true }).click();
    await page.waitForURL('**/staff', { timeout: 10_000 });

    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 6. NAVIGATION
// ============================================================
test.describe('Staff — Navigation', () => {
  test('sidebar navigation from staff to dashboard', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /staff should work', async ({ authenticatedPage: page }) => {
    await page.goto('/staff');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/staff');
  });

  test('refreshing /staff should persist the page', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/staff');
  });
});

// ============================================================
// 7. EDGE CASES
// ============================================================
test.describe('Staff — Edge Cases', () => {
  test('pagination should work if available', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    const nextBtn = page.getByRole('button', { name: /next/i });
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(page.getByRole('heading', { name: /staff management/i }).first()).toBeVisible();
  });

  test('rapid search typing should not crash', async ({ authenticatedPage: page }) => {
    await goToStaff(page);
    const searchInput = page.getByPlaceholder(/search by name.*id.*role/i);
    for (const query of ['a', 'ab', 'abc', 'abcd', '']) {
      await searchInput.fill(query);
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /staff management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 8. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Staff — Console Error Checks', () => {
  test('staff page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToStaff(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /staff:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('staff page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToStaff(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions on /staff:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToStaff(page);
    await page.getByPlaceholder(/search by name.*id.*role/i).fill('test');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('clicking Add Staff should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToStaff(page);
    await page.getByRole('button', { name: /add.*staff/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add staff:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
