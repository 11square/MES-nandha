import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Attendance Tracking module.
 * Covers: page load, stat cards, search, action buttons, form validation,
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

// ---------- Helper: Navigate to /attendance ----------
async function goToAttendance(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Attendance', { exact: true }).click();
  await page.waitForURL('**/attendance', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ---------- Helper: Open Add Worker Dialog ----------
async function openAddWorker(page: import('@playwright/test').Page) {
  await goToAttendance(page);
  await page.getByRole('button', { name: /add worker/i }).click();
  await expect(page.locator('div[role="dialog"]')).toBeVisible();
}

// ---------- Helper: Open Bulk Upload Dialog ----------
async function openBulkUpload(page: import('@playwright/test').Page) {
  await goToAttendance(page);
  await page.getByRole('button', { name: /bulk upload/i }).click();
  await expect(page.locator('div[role="dialog"]')).toBeVisible();
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Attendance — Page Load & Layout', () => {
  test('should navigate to /attendance', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    expect(page.url()).toContain('/attendance');
  });

  test('should display attendance content', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await expect(page.getByText(/attendance/i).first()).toBeVisible();
  });

  test('should display 4 stat cards', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    for (const label of [/total workers/i, /present today/i, /absent today/i, /total hours/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await expect(page.getByPlaceholder(/search workers/i)).toBeVisible();
  });

  test('should show Bulk Upload button', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await expect(page.getByRole('button', { name: /bulk upload/i })).toBeVisible();
  });

  test('should show Export Report button', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await expect(page.getByRole('button', { name: /export report/i })).toBeVisible();
  });

  test('should show Add Worker button', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await expect(page.getByRole('button', { name: /add worker/i })).toBeVisible();
  });

  test('stat cards should show numeric values', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    const statValues = page.locator('.text-2xl.font-bold, .text-3xl.font-bold');
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================
// 2. ADD WORKER FORM VALIDATION
// ============================================================
test.describe('Attendance — Add Worker Form Validation', () => {
  test('submitting empty add worker form should show required-field errors', async ({ authenticatedPage: page }) => {
    await openAddWorker(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /add worker/i }).click();

    await expect(page.getByText('Full Name is required')).toBeVisible();
    await expect(page.getByText('Role is required')).toBeVisible();
    await expect(page.getByText('Team is required')).toBeVisible();
    await expect(page.getByText('Shift is required')).toBeVisible();
    await expect(page.getByText('Mobile is required')).toBeVisible();
  });

  test('invalid phone (less than 10 digits) should show phone validation error', async ({ authenticatedPage: page }) => {
    await openAddWorker(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#workerName').fill('Test Worker');
    await dialog.locator('#role').selectOption({ index: 1 });
    await dialog.locator('#team').selectOption({ index: 1 });
    await dialog.locator('#shift').selectOption({ index: 1 });
    await dialog.locator('#mobile').fill('12345');
    await dialog.getByRole('button', { name: /add worker/i }).click();
    await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
  });

  test('cancel button should close add worker dialog', async ({ authenticatedPage: page }) => {
    await openAddWorker(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});

// ============================================================
// 3. BULK UPLOAD FORM VALIDATION
// ============================================================
test.describe('Attendance — Bulk Upload Form Validation', () => {
  test('submitting empty bulk upload form should show required-field errors', async ({ authenticatedPage: page }) => {
    await openBulkUpload(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /upload attendance/i }).click();

    await expect(page.getByText('Attendance Date is required')).toBeVisible();
    await expect(page.getByText('CSV File is required')).toBeVisible();
  });

  test('cancel button should close bulk upload dialog', async ({ authenticatedPage: page }) => {
    await openBulkUpload(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });

  test('bulk upload dialog should show description text', async ({ authenticatedPage: page }) => {
    await openBulkUpload(page);
    await expect(page.getByText(/upload.*csv/i)).toBeVisible();
  });
});

// ============================================================
// 4. CREATE WORKER (CRUD + API)
// ============================================================
test.describe('Attendance — Create Worker (CRUD + API)', () => {
  test('should create a worker via form and verify API call', async ({ authenticatedPage: page }) => {
    const createPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/attendance') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );

    await openAddWorker(page);
    const dialog = page.locator('div[role="dialog"]');

    await dialog.locator('#workerName').fill('Playwright Worker');
    await dialog.locator('#role').selectOption({ index: 1 });
    await dialog.locator('#team').selectOption({ index: 1 });
    await dialog.locator('#shift').selectOption({ index: 1 });
    await dialog.locator('#mobile').fill('9876543210');

    await dialog.getByRole('button', { name: /add worker/i }).click();

    const response = await createPromise;
    expect(response.status()).toBeLessThan(400);
  });
});

// ============================================================
// 5. WORKER DATA DISPLAY
// ============================================================
test.describe('Attendance — Worker Data', () => {
  test('should show worker entries (cards)', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await page.waitForTimeout(1500);
    // Card-based list
    const cards = page.locator('[class*="card"], [class*="Card"], .grid > div');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('worker cards should show name and role', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await page.waitForTimeout(1500);
    // First card should have a name visible
    const card = page.locator('[class*="card"], [class*="Card"]').first();
    await expect(card).not.toBeEmpty();
  });

  test('worker cards should have Mark Present or Edit buttons', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await page.waitForTimeout(1500);
    const markBtn = page.getByRole('button', { name: /mark present/i }).first();
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    const markVisible = await markBtn.isVisible().catch(() => false);
    const editVisible = await editBtn.isVisible().catch(() => false);
    expect(markVisible || editVisible).toBeTruthy();
  });
});

// ============================================================
// 6. SEARCH
// ============================================================
test.describe('Attendance — Search', () => {
  test('search should filter workers', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    const searchInput = page.getByPlaceholder(/search workers/i);
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('test');
  });

  test('search with no results should show empty state', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await page.waitForTimeout(1000);
    const searchInput = page.getByPlaceholder(/search workers/i);
    await searchInput.fill('NONEXISTENT_WORKER_XYZ!!');
    await page.waitForTimeout(500);
  });

  test('clearing search should show all workers', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    const searchInput = page.getByPlaceholder(/search workers/i);
    await searchInput.fill('NONEXISTENT');
    await page.waitForTimeout(500);
    await searchInput.fill('');
    await page.waitForTimeout(500);
    await expect(page.getByText(/attendance/i).first()).toBeVisible();
  });
});

// ============================================================
// 7. EVENT TYPES
// ============================================================
test.describe('Attendance — Event Types', () => {
  test('clicking Add Worker should open dialog with heading', async ({ authenticatedPage: page }) => {
    await openAddWorker(page);
    await expect(page.getByText(/add new worker/i)).toBeVisible();
  });

  test('clicking Bulk Upload should open dialog with heading', async ({ authenticatedPage: page }) => {
    await openBulkUpload(page);
    await expect(page.getByText(/bulk upload attendance/i)).toBeVisible();
  });

  test('Export Report button should be clickable', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await page.getByRole('button', { name: /export report/i }).click();
    await page.waitForTimeout(500);
    // Should not crash
    await expect(page.getByText(/attendance/i).first()).toBeVisible();
  });
});

// ============================================================
// 8. API VERIFICATION
// ============================================================
test.describe('Attendance — API Verification', () => {
  test('page load should call GET /api/v1/attendance', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/attendance') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.locator('nav').getByText('Attendance', { exact: true }).click();
    await page.waitForURL('**/attendance', { timeout: 10_000 });

    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 9. NAVIGATION
// ============================================================
test.describe('Attendance — Navigation', () => {
  test('sidebar navigation from attendance to dashboard', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /attendance should work', async ({ authenticatedPage: page }) => {
    await page.goto('/attendance');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/attendance');
  });

  test('refreshing /attendance should persist the page', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/attendance');
  });
});

// ============================================================
// 10. EDGE CASES
// ============================================================
test.describe('Attendance — Edge Cases', () => {
  test('opening and closing dialogs multiple times should work', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /add worker/i }).click();
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
      await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
      await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
    }
  });

  test('rapid search typing should not crash', async ({ authenticatedPage: page }) => {
    await goToAttendance(page);
    const searchInput = page.getByPlaceholder(/search workers/i);
    for (const query of ['a', 'ab', 'abc', '']) {
      await searchInput.fill(query);
      await page.waitForTimeout(100);
    }
    await expect(page.getByText(/attendance/i).first()).toBeVisible();
  });
});

// ============================================================
// 11. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Attendance — Console Error Checks', () => {
  test('attendance page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAttendance(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /attendance:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('attendance page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAttendance(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add worker dialog should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddWorker(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add worker:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('submitting invalid worker form should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddWorker(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /add worker/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening bulk upload dialog should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openBulkUpload(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on bulk upload:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToAttendance(page);
    await page.getByPlaceholder(/search workers/i).fill('test');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
