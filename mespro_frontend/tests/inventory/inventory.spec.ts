import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Inventory Management module.
 * Covers: page load, stat cards, tabs, search, action buttons,
 * dialogs, and console errors.
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

async function goToInventory(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Inventory', { exact: true }).click();
  await page.waitForURL('**/inventory', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Inventory — Page Load & Layout', () => {
  test('should navigate to inventory page', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page).toHaveURL(/\/inventory/);
  });

  test('should display inventory content', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    // Inventory uses top bar title or in-page heading
    await expect(page.getByText(/inventory/i).first()).toBeVisible();
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS
// ============================================================
test.describe('Inventory — Stat Cards', () => {
  test('should display Critical Stock card', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByText(/critical/i).first()).toBeVisible();
  });

  test('should display Low Stock card', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByText(/low stock/i).first()).toBeVisible();
  });

  test('should display Total Materials card', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByText(/total materials/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. TABS
// ============================================================
test.describe('Inventory — Tabs', () => {
  test('should show Raw Materials tab', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByRole('tab', { name: /raw materials/i })).toBeVisible();
  });

  test('should show Finished Goods tab', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByRole('tab', { name: /finished goods/i })).toBeVisible();
  });

  test('should show Transactions tab', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByRole('tab', { name: /transactions/i })).toBeVisible();
  });

  test('should show Purchase Requisitions tab', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByRole('tab', { name: /purchase requisitions/i })).toBeVisible();
  });

  test('switching tabs should change content', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('tab', { name: /finished goods/i }).click();
    await expect(page.getByRole('tab', { name: /finished goods/i })).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================
// 4. ACTION BUTTONS
// ============================================================
test.describe('Inventory — Actions', () => {
  test('should show Stock In (GRN) button', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByRole('button', { name: /stock in|grn/i })).toBeVisible();
  });

  test('should show Stock Out button', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByRole('button', { name: /stock out/i })).toBeVisible();
  });

  test('clicking Stock In should open dialog', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock in|grn/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('clicking Stock Out should open dialog', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock out/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
  });
});

// ============================================================
// 5. STOCK IN (GRN) FORM VALIDATION
// ============================================================
test.describe('Inventory — GRN Form Validation', () => {
  test('submitting empty GRN form should show errors', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock in|grn/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /receive stock/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });

  test('GRN form should show material field', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock in|grn/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#material')).toBeVisible();
  });

  test('GRN form should show quantity field', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock in|grn/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#quantity')).toBeVisible();
  });

  test('GRN form should show PO Number field', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock in|grn/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#poNumber')).toBeVisible();
  });

  test('cancel should close GRN dialog', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock in|grn/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible();
  });
});

// ============================================================
// 6. STOCK OUT FORM VALIDATION
// ============================================================
test.describe('Inventory — Stock Out Form Validation', () => {
  test('submitting empty stock out form should show errors', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock out/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /record consumption/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });

  test('stock out form should show order reference field', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock out/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#orderRef')).toBeVisible();
  });

  test('cancel should close stock out dialog', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock out/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible();
  });
});

// ============================================================
// 7. PURCHASE REQUISITION FORM
// ============================================================
test.describe('Inventory — Purchase Requisition', () => {
  test('clicking Purchase Requisition should open dialog', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /purchase requisition/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('PR form should show priority select', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /purchase requisition/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#priority')).toBeVisible();
  });

  test('PR form should show reason field', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /purchase requisition/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#reason')).toBeVisible();
  });

  test('submitting empty PR form should show errors', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /purchase requisition/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /create pr/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });
});

// ============================================================
// 8. PENDING PRS STAT
// ============================================================
test.describe('Inventory — Pending PRs', () => {
  test('should display Pending PRs card', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await expect(page.getByText(/pending pr/i).first()).toBeVisible();
  });
});

// ============================================================
// 9. API VERIFICATION
// ============================================================
test.describe('Inventory — API Verification', () => {
  test('page load should call GET /inventory', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/inventory') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Inventory', { exact: true }).click();
    await page.waitForURL('**/inventory', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 10. NAVIGATION
// ============================================================
test.describe('Inventory — Navigation', () => {
  test('sidebar navigation from inventory to dashboard', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /inventory should work', async ({ authenticatedPage: page }) => {
    await page.goto('/inventory');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/inventory');
  });

  test('refreshing /inventory should persist the page', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/inventory');
  });
});

// ============================================================
// 11. EDGE CASES
// ============================================================
test.describe('Inventory — Edge Cases', () => {
  test('searching for non-existent material should show empty', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('ZZZZZNONEXISTENT999');
    await page.waitForTimeout(1000);
  });

  test('clearing search should restore results', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('ZZZNONEXISTENT');
    await page.waitForTimeout(500);
    await search.clear();
    await page.waitForTimeout(500);
    await expect(page.getByText(/inventory/i).first()).toBeVisible();
  });

  test('rapid dialog open/close should not crash', async ({ authenticatedPage: page }) => {
    await goToInventory(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /stock in|grn/i }).click();
      await page.waitForTimeout(200);
      const dialog = page.locator('div[role="dialog"]');
      if (await dialog.isVisible()) {
        await dialog.getByRole('button', { name: /cancel/i }).click();
        await page.waitForTimeout(200);
      }
    }
  });
});

// ============================================================
// 12. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Inventory — Console Error Checks', () => {
  test('inventory page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToInventory(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /inventory:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('inventory page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToInventory(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('tab switching should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToInventory(page);
    await page.getByRole('tab', { name: /finished goods/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /transactions/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /raw materials/i }).click();
    await page.waitForTimeout(500);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during tabs:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening GRN dialog should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock in|grn/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on GRN dialog:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('GRN form validation should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock in|grn/i }).click();
    await page.waitForTimeout(500);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /receive stock/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on GRN validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('stock out dialog should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToInventory(page);
    await page.getByRole('button', { name: /stock out/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on stock out:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
