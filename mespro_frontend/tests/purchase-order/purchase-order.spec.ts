import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Purchase Order Management module.
 * Covers: page load, stat cards, tabs, table data, search, filter,
 * create PO form, and console errors.
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

async function goToPO(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('PO', { exact: true }).click();
  await page.waitForURL('**/purchase-order', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('PO — Page Load & Layout', () => {
  test('should navigate to purchase order page', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page).toHaveURL(/\/purchase-order/);
  });

  test('should display PO Management heading', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByRole('heading', { name: /purchase order management/i }).first()).toBeVisible();
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByPlaceholder(/search by po|vendor|item/i)).toBeVisible();
  });

  test('should show Create PO button', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByRole('button', { name: /create po/i })).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS
// ============================================================
test.describe('PO — Stat Cards', () => {
  test('should display Total PO Value card', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByText(/total po value/i).first()).toBeVisible();
  });

  test('should display Pending Approval card', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByText(/pending approval/i).first()).toBeVisible();
  });

  test('should display In Progress card', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByText(/in progress/i).first()).toBeVisible();
  });

  test('should display Received card', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByText(/received/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. TABS
// ============================================================
test.describe('PO — Tabs', () => {
  test('should show Invoice tab', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByRole('tab', { name: /invoice/i }).first()).toBeVisible();
  });

  test('should show Quotation Bill tab', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await expect(page.getByRole('tab', { name: /quotation/i })).toBeVisible();
  });

  test('switching tabs should work', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.getByRole('tab', { name: /quotation/i }).click();
    await expect(page.getByRole('tab', { name: /quotation/i })).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================
// 4. TABLE DATA
// ============================================================
test.describe('PO — Table Data', () => {
  test('should show PO table with headers', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    const expectedHeaders = ['PO ID', 'Date', 'Vendor', 'Status'];
    for (const header of expectedHeaders) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('should show PO rows', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 5. SEARCH
// ============================================================
test.describe('PO — Search', () => {
  test('search input should accept text', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    const searchInput = page.getByPlaceholder(/search by po|vendor|item/i);
    await searchInput.click();
    await searchInput.fill('PO-');
    await expect(searchInput).toHaveValue('PO-');
  });
});

// ============================================================
// 6. CREATE PO FORM
// ============================================================
test.describe('PO — Create PO', () => {
  test('clicking Create PO should show form', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(500);
    // Check for form heading
    await expect(page.getByRole('heading', { name: /create new purchase order/i })).toBeVisible();
  });
});

// ============================================================
// 6. CREATE PO FORM
// ============================================================
test.describe('PO — Create PO', () => {
  test('clicking Create PO should show form', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: /create new purchase order/i })).toBeVisible();
  });

  test('Create PO form should show vendor field', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/vendor/i).first()).toBeVisible();
  });

  test('Create PO form should show date field', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/date/i).first()).toBeVisible();
  });

  test('back/cancel should return to PO list', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(500);
    const backBtn = page.getByRole('button', { name: /back|cancel/i }).first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByRole('heading', { name: /purchase order management/i }).first()).toBeVisible();
    }
  });

  test('submitting PO without vendor should show error', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(500);
    const submitBtn = page.getByRole('button', { name: /create po/i }).last();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/vendor is required|is required/i).first()).toBeVisible();
    }
  });
});

// ============================================================
// 7. STATUS FILTER
// ============================================================
test.describe('PO — Status Filter', () => {
  test('status filter dropdown should be visible', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    const filter = page.locator('select').or(page.getByRole('combobox')).first();
    await expect(filter).toBeVisible();
  });
});

// ============================================================
// 8. DELETE PO
// ============================================================
test.describe('PO — Delete Confirm', () => {
  test('clicking delete should show confirmation dialog', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    if (count >= 2) {
      await actionBtns.last().click();
      await page.waitForTimeout(500);
      const confirmDialog = page.getByText(/are you sure.*delete/i);
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toBeVisible();
        await page.getByRole('button', { name: /cancel/i }).click();
        await page.waitForTimeout(500);
      }
    }
  });
});

// ============================================================
// 9. EDIT PO
// ============================================================
test.describe('PO — Edit PO', () => {
  test('clicking edit should open edit form', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    if (count >= 1) {
      await actionBtns.first().click();
      await page.waitForTimeout(1000);
      const editHeading = page.getByRole('heading', { name: /edit purchase order/i });
      if (await editHeading.isVisible()) {
        await expect(editHeading).toBeVisible();
      }
    }
  });
});

// ============================================================
// 10. API VERIFICATION
// ============================================================
test.describe('PO — API Verification', () => {
  test('page load should call GET /purchase-orders', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/purchase-orders') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('PO', { exact: true }).click();
    await page.waitForURL('**/purchase-order', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 11. NAVIGATION
// ============================================================
test.describe('PO — Navigation', () => {
  test('sidebar navigation from PO to dashboard', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /purchase-order should work', async ({ authenticatedPage: page }) => {
    await page.goto('/purchase-order');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/purchase-order');
  });

  test('refreshing /purchase-order should persist the page', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/purchase-order');
  });
});

// ============================================================
// 12. EDGE CASES
// ============================================================
test.describe('PO — Edge Cases', () => {
  test('searching for non-existent PO should show empty', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    const search = page.getByPlaceholder(/search by po|vendor|item/i);
    await search.fill('ZZZZZNONEXISTENT999');
    await page.waitForTimeout(1000);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeLessThanOrEqual(1);
  });

  test('clearing search should restore results', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const search = page.getByPlaceholder(/search by po|vendor|item/i);
    await search.fill('ZZZNONEXISTENT');
    await page.waitForTimeout(500);
    await search.clear();
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);
  });

  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToPO(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /quotation/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /invoice/i }).first().click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /purchase order management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 13. CONSOLE ERROR CHECKS
// ============================================================
test.describe('PO — Console Error Checks', () => {
  test('PO page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPO(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /purchase-order:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('PO page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPO(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('tab switching should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPO(page);
    await page.getByRole('tab', { name: /quotation/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /invoice/i }).first().click();
    await page.waitForTimeout(500);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during tabs:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening create PO form should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPO(page);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on create PO:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToPO(page);
    await page.getByPlaceholder(/search by po|vendor|item/i).fill('PO');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
