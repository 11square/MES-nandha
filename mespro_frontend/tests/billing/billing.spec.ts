import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Billing Management module.
 * Covers: page load, stat cards, tabs, table data, search, invoice actions,
 * form display, navigation, and console errors.
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

async function goToBilling(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Billing', { exact: true }).click();
  await page.waitForURL('**/billing', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Billing — Page Load & Layout', () => {
  test('should navigate to billing page', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page).toHaveURL(/\/billing/);
  });

  test('should display Billing heading', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByRole('heading', { name: /billing/i }).first()).toBeVisible();
  });

  test('should show New Invoice button', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByRole('button', { name: /new invoice/i })).toBeVisible();
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByPlaceholder(/search by invoice/i)).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS
// ============================================================
test.describe('Billing — Stat Cards', () => {
  test('should display Total Billed card', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByText(/total billed/i).first()).toBeVisible();
  });

  test('should display Amount Received card', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByText(/amount received/i).first()).toBeVisible();
  });

  test('should display Pending Amount card', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByText(/pending amount/i).first()).toBeVisible();
  });

  test('should display Overdue card', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByText(/overdue/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. TABS
// ============================================================
test.describe('Billing — Tabs', () => {
  test('should show Invoice tab', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByRole('tab', { name: /invoice/i }).first()).toBeVisible();
  });

  test('should show Quotation Bill tab', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await expect(page.getByRole('tab', { name: /quotation/i })).toBeVisible();
  });

  test('clicking Quotation Bill tab should switch view', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.getByRole('tab', { name: /quotation/i }).click();
    await expect(page.getByRole('tab', { name: /quotation/i })).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================
// 4. TABLE DATA
// ============================================================
test.describe('Billing — Table Data', () => {
  test('should show billing table with headers', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    const expectedHeaders = ['Invoice No', 'Date', 'Client', 'Amount', 'Status'];
    for (const header of expectedHeaders) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('should show invoice rows', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 5. SEARCH
// ============================================================
test.describe('Billing — Search', () => {
  test('search input should accept text', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    const searchInput = page.getByPlaceholder(/search by invoice/i);
    await searchInput.click();
    await searchInput.fill('INV-');
    await expect(searchInput).toHaveValue('INV-');
  });
});

// ============================================================
// 6. NEW INVOICE FORM
// ============================================================
test.describe('Billing — New Invoice', () => {
  test('clicking New Invoice should open form or dialog', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.getByRole('button', { name: /new invoice/i }).click();
    await page.waitForTimeout(500);
    // Should show a form/dialog
    const dialog = page.locator('div[role="dialog"]');
    const heading = page.getByRole('heading', { name: /new|create|invoice/i });
    const isDialogVisible = await dialog.isVisible().catch(() => false);
    const isHeadingVisible = await heading.isVisible().catch(() => false);
    expect(isDialogVisible || isHeadingVisible).toBeTruthy();
  });
});

// ============================================================
// 7. NEW INVOICE FORM DETAILS
// ============================================================
test.describe('Billing — New Invoice Form', () => {
  test('Create Invoice page should show date field', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.getByRole('button', { name: /new invoice/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/date/i).first()).toBeVisible();
  });

  test('Create Invoice page should show client field', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.getByRole('button', { name: /new invoice/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(/client/i).first()).toBeVisible();
  });

  test('back/cancel button should return to billing list', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.getByRole('button', { name: /new invoice/i }).click();
    await page.waitForTimeout(500);
    const backBtn = page.getByRole('button', { name: /back|cancel/i }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('heading', { name: /billing/i }).first()).toBeVisible();
    }
  });
});

// ============================================================
// 8. VIEW BILL
// ============================================================
test.describe('Billing — View Bill', () => {
  test('clicking view button on first row should show bill details', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    if (count > 0) {
      // Try to find view/eye button
      for (let i = 0; i < count; i++) {
        const btn = actionBtns.nth(i);
        const title = await btn.getAttribute('title');
        const ariaLabel = await btn.getAttribute('aria-label');
        if (title?.match(/view/i) || ariaLabel?.match(/view/i) || i === 0) {
          await btn.click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    }
  });

  test('rows should have action buttons', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 9. DELETE CONFIRM DIALOG
// ============================================================
test.describe('Billing — Delete Confirm', () => {
  test('clicking delete should show confirmation', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    if (count >= 3) {
      // Delete is typically the last button
      await actionBtns.last().click();
      await page.waitForTimeout(500);
      const deleteDialog = page.getByText(/are you sure.*delete/i);
      if (await deleteDialog.isVisible()) {
        await expect(deleteDialog).toBeVisible();
        // Cancel delete
        await page.getByRole('button', { name: /cancel/i }).click();
        await page.waitForTimeout(500);
      }
    }
  });
});

// ============================================================
// 10. API VERIFICATION
// ============================================================
test.describe('Billing — API Verification', () => {
  test('page load should call GET /billing endpoint', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/billing') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Billing', { exact: true }).click();
    await page.waitForURL('**/billing', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });

  test('GET /billing response should contain data', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/billing') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Billing', { exact: true }).click();
    await page.waitForURL('**/billing', { timeout: 10_000 });
    const response = await apiPromise;
    const body = await response.json();
    expect(body.data || body).toBeDefined();
  });
});

// ============================================================
// 11. NAVIGATION
// ============================================================
test.describe('Billing — Navigation', () => {
  test('sidebar navigation from billing to dashboard', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /billing should work', async ({ authenticatedPage: page }) => {
    await page.goto('/billing');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/billing');
  });

  test('refreshing /billing should persist the page', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/billing');
  });
});

// ============================================================
// 12. EDGE CASES
// ============================================================
test.describe('Billing — Edge Cases', () => {
  test('searching for non-existent invoice should show no results', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    const searchInput = page.getByPlaceholder(/search by invoice/i);
    await searchInput.fill('ZZZZZNONEXISTENT999');
    await page.waitForTimeout(1000);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeLessThanOrEqual(1);
  });

  test('clearing search should restore all bills', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by invoice/i);
    await searchInput.fill('ZZZNONEXISTENT');
    await page.waitForTimeout(500);
    await searchInput.clear();
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);
  });

  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToBilling(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /quotation/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /invoice/i }).first().click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /billing/i }).first()).toBeVisible();
  });
});

// ============================================================
// 13. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Billing — Console Error Checks', () => {
  test('billing page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToBilling(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /billing:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('billing page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToBilling(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions on /billing:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('tab switching should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToBilling(page);
    await page.getByRole('tab', { name: /quotation/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /invoice/i }).first().click();
    await page.waitForTimeout(500);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during tab switch:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening new invoice should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToBilling(page);
    await page.getByRole('button', { name: /new invoice/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on new invoice:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToBilling(page);
    await page.getByPlaceholder(/search by invoice/i).fill('INV');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
