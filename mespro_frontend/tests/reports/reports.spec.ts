import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Reports / Business Analytics module.
 * Covers: page load, stat cards, tabs, sub-sections, event types,
 * navigation, edge cases, and console errors.
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

// ---------- Helper: Navigate to /reports ----------
async function goToReports(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Reports', { exact: true }).click();
  await page.waitForURL('**/reports', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Reports — Page Load & Layout', () => {
  test('should navigate to /reports and show heading', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    expect(page.url()).toContain('/reports');
    await expect(page.getByRole('heading', { name: /business analytics.*reports/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await expect(page.getByText(/comprehensive insights/i)).toBeVisible();
  });

  test('should display 4 top stat cards', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    for (const label of [/total leads/i, /orders completed/i, /monthly revenue/i, /on-time delivery/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('should show Export All Reports button', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await expect(page.getByRole('button', { name: /export all reports/i })).toBeVisible();
  });

  test('should show all 5 tabs', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /sales.*leads/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /production/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /inventory/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /attendance/i })).toBeVisible();
  });

  test('stat cards should show numeric values', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    const statValues = page.locator('.text-2xl.font-bold, .text-3xl.font-bold');
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================
// 2. OVERVIEW TAB
// ============================================================
test.describe('Reports — Overview Tab', () => {
  test('Overview tab should be active by default', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await expect(page.getByRole('tab', { name: /overview/i })).toHaveAttribute('data-state', 'active');
  });

  test('Overview tab should show content', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    // Should have overview charts or summary data
    await page.waitForTimeout(1000);
    const content = page.locator('[data-state="active"]').first();
    await expect(content).toBeVisible();
  });
});

// ============================================================
// 3. SALES & LEADS TAB
// ============================================================
test.describe('Reports — Sales & Leads Tab', () => {
  test('clicking Sales & Leads tab should switch view', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /sales.*leads/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /sales.*leads/i })).toHaveAttribute('data-state', 'active');
  });

  test('Sales & Leads tab should show relevant content', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /sales.*leads/i }).click();
    await page.waitForTimeout(500);
    // Should show export buttons or chart data
    const exportBtns = page.getByRole('button', { name: /export/i });
    const count = await exportBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 4. PRODUCTION TAB
// ============================================================
test.describe('Reports — Production Tab', () => {
  test('clicking Production tab should switch view', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /production/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /production/i })).toHaveAttribute('data-state', 'active');
  });

  test('Production tab should show production stats', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /production/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/orders in production/i).first()).toBeVisible();
  });
});

// ============================================================
// 5. INVENTORY TAB
// ============================================================
test.describe('Reports — Inventory Tab', () => {
  test('clicking Inventory tab should switch view', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /inventory/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /inventory/i })).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================
// 6. ATTENDANCE TAB
// ============================================================
test.describe('Reports — Attendance Tab', () => {
  test('clicking Attendance tab should switch view', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /attendance/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /attendance/i })).toHaveAttribute('data-state', 'active');
  });

  test('Attendance tab should show attendance statistics', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /attendance/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/total workers/i).first()).toBeVisible();
  });
});

// ============================================================
// 7. EVENT TYPES
// ============================================================
test.describe('Reports — Event Types', () => {
  test('switching between all tabs should work', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    const tabs = [/sales.*leads/i, /production/i, /inventory/i, /attendance/i, /overview/i];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForTimeout(300);
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('data-state', 'active');
    }
  });

  test('clicking Export All Reports should trigger some action', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.getByRole('button', { name: /export all reports/i }).click();
    await page.waitForTimeout(1000);
    // Should not crash
    await expect(page.getByRole('heading', { name: /business analytics.*reports/i }).first()).toBeVisible();
  });

  test('sub-section Export buttons should be clickable', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    const exportBtns = page.getByRole('button', { name: /export/i });
    const count = await exportBtns.count();
    if (count > 1) {
      await exportBtns.nth(1).click();
      await page.waitForTimeout(500);
    }
    await expect(page.getByRole('heading', { name: /business analytics.*reports/i }).first()).toBeVisible();
  });
});

// ============================================================
// 8. API VERIFICATION
// ============================================================
test.describe('Reports — API Verification', () => {
  test('page load should call GET /api/v1/reports endpoints', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/reports') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.locator('nav').getByText('Reports', { exact: true }).click();
    await page.waitForURL('**/reports', { timeout: 10_000 });

    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 9. NAVIGATION
// ============================================================
test.describe('Reports — Navigation', () => {
  test('sidebar navigation from reports to dashboard', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /reports should work', async ({ authenticatedPage: page }) => {
    await page.goto('/reports');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/reports');
  });

  test('refreshing /reports should persist the page', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/reports');
  });
});

// ============================================================
// 10. EDGE CASES
// ============================================================
test.describe('Reports — Edge Cases', () => {
  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToReports(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /production/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /attendance/i }).click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /business analytics.*reports/i }).first()).toBeVisible();
  });
});

// ============================================================
// 11. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Reports — Console Error Checks', () => {
  test('reports page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToReports(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /reports:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('reports page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToReports(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Sales & Leads tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /sales.*leads/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on sales tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Production tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /production/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on production tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Attendance tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /attendance/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on attendance tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Inventory tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToReports(page);
    await page.getByRole('tab', { name: /inventory/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on inventory tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
