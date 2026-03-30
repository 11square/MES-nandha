import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Vendor Management module.
 * Covers: page load, tabs, table data, form validation, CRUD operations,
 * detail view, API verification, navigation, edge cases, and console errors.
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

// ---------- Helper: Navigate to /vendors ----------
async function goToVendors(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Vendors', { exact: true }).click();
  await page.waitForURL('**/vendors', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ---------- Helper: Open Add Vendor Dialog ----------
async function openAddVendor(page: import('@playwright/test').Page) {
  await goToVendors(page);
  await page.getByRole('button', { name: /add vendor/i }).click();
  await expect(page.locator('div[role="dialog"]')).toBeVisible();
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Vendors — Page Load & Layout', () => {
  test('should navigate to /vendors and show heading', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    expect(page.url()).toContain('/vendors');
    await expect(page.getByRole('heading', { name: /vendor management/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await expect(page.getByText(/manage your vendors and suppliers/i)).toBeVisible();
  });

  test('should show Vendor List and Vendor Details tabs', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await expect(page.getByRole('tab', { name: /vendor list/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /vendor details/i })).toBeVisible();
  });

  test('should show Add Vendor button', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await expect(page.getByRole('button', { name: /add vendor/i })).toBeVisible();
  });

  test('should show vendor table with correct headers', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    for (const header of ['Vendor Name', 'Contact Person', 'Email', 'Phone', 'Category', 'Status']) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });
});

// ============================================================
// 2. ADD VENDOR FORM VALIDATION
// ============================================================
test.describe('Vendors — Add Vendor Form Validation', () => {
  test('submitting empty form should show required-field errors', async ({ authenticatedPage: page }) => {
    await openAddVendor(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /add/i }).click();

    await expect(page.getByText('Vendor Name is required')).toBeVisible();
    await expect(page.getByText('Contact Person is required')).toBeVisible();
    await expect(page.getByText('Category is required')).toBeVisible();
    await expect(page.getByText('Address is required')).toBeVisible();
  });

  test('vendor name with 1 character should show min-length error', async ({ authenticatedPage: page }) => {
    await openAddVendor(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#vendor-name').fill('A');
    await dialog.locator('#vendor-contact').fill('Test Person');
    await dialog.locator('#vendor-email').fill('test@test.com');
    await dialog.locator('#vendor-phone').fill('9876543210');
    await dialog.locator('#vendor-category').fill('Hardware');
    await dialog.locator('#vendor-address').fill('Test Address');
    await dialog.getByRole('button', { name: /add/i }).click();
    await expect(page.getByText(/vendor name must be at least 2 characters/i)).toBeVisible();
  });

  test('invalid email should show email validation error', async ({ authenticatedPage: page }) => {
    await openAddVendor(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#vendor-name').fill('Test Vendor');
    await dialog.locator('#vendor-contact').fill('Test Person');
    await dialog.locator('#vendor-email').fill('invalid-email');
    await dialog.locator('#vendor-phone').fill('9876543210');
    await dialog.locator('#vendor-category').fill('Hardware');
    await dialog.locator('#vendor-address').fill('Test Address');
    await dialog.getByRole('button', { name: /add/i }).click();
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  });

  test('invalid phone should show phone validation error', async ({ authenticatedPage: page }) => {
    await openAddVendor(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#vendor-name').fill('Test Vendor');
    await dialog.locator('#vendor-contact').fill('Test Person');
    await dialog.locator('#vendor-email').fill('test@test.com');
    await dialog.locator('#vendor-phone').fill('123');
    await dialog.locator('#vendor-category').fill('Hardware');
    await dialog.locator('#vendor-address').fill('Test Address');
    await dialog.getByRole('button', { name: /add/i }).click();
    await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
  });

  test('cancel button should close dialog', async ({ authenticatedPage: page }) => {
    await openAddVendor(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});

// ============================================================
// 3. CREATE VENDOR (CRUD + API)
// ============================================================
test.describe('Vendors — Create Vendor (CRUD + API)', () => {
  test('should create a vendor via form and verify API call', async ({ authenticatedPage: page }) => {
    const createPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/vendors') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );

    await openAddVendor(page);
    const dialog = page.locator('div[role="dialog"]');

    await dialog.locator('#vendor-name').fill('Playwright Vendor');
    await dialog.locator('#vendor-contact').fill('John Doe');
    await dialog.locator('#vendor-email').fill('vendor@playwright.com');
    await dialog.locator('#vendor-phone').fill('9876543210');
    await dialog.locator('#vendor-category').fill('Hardware');
    await dialog.locator('#vendor-address').fill('123 Test Street');

    await dialog.getByRole('button', { name: /add/i }).click();

    const response = await createPromise;
    expect(response.status()).toBeLessThan(400);
  });
});

// ============================================================
// 4. READ & TABLE DATA
// ============================================================
test.describe('Vendors — Read & Table Data', () => {
  test('vendor table should display rows', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('each row should show vendor name', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const firstCell = page.locator('tbody tr').first().locator('td').first();
    await expect(firstCell).not.toBeEmpty();
  });

  test('each row should show status badge', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const statusCell = page.locator('tbody tr').first().locator('td').nth(5);
    await expect(statusCell).not.toBeEmpty();
  });

  test('each row should have action buttons', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 5. VENDOR DETAILS TAB
// ============================================================
test.describe('Vendors — Vendor Details Tab', () => {
  test('clicking Vendor Details tab should switch view', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.getByRole('tab', { name: /vendor details/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /vendor details/i })).toHaveAttribute('data-state', 'active');
  });

  test('vendor details should show sub-tabs', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.getByRole('tab', { name: /vendor details/i }).click();
    await page.waitForTimeout(500);
    // Should show purchase history, outstanding history, transaction history tabs
    await expect(page.getByRole('tab', { name: /purchase history/i })).toBeVisible();
  });

  test('vendor details should show stat cards', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.getByRole('tab', { name: /vendor details/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/total purchases/i).first()).toBeVisible();
  });
});

// ============================================================
// 6. EVENT TYPES
// ============================================================
test.describe('Vendors — Event Types', () => {
  test('clicking Add Vendor should open dialog with heading', async ({ authenticatedPage: page }) => {
    await openAddVendor(page);
    await expect(page.getByText(/add new vendor/i)).toBeVisible();
  });

  test('switching between tabs should update content', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.getByRole('tab', { name: /vendor details/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('tab', { name: /vendor list/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('tab', { name: /vendor list/i })).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================
// 7. API VERIFICATION
// ============================================================
test.describe('Vendors — API Verification', () => {
  test('page load should call GET /api/v1/vendors', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/vendors') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.locator('nav').getByText('Vendors', { exact: true }).click();
    await page.waitForURL('**/vendors', { timeout: 10_000 });

    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 8. NAVIGATION
// ============================================================
test.describe('Vendors — Navigation', () => {
  test('sidebar navigation from vendors to dashboard', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /vendors should work', async ({ authenticatedPage: page }) => {
    await page.goto('/vendors');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/vendors');
  });

  test('refreshing /vendors should persist the page', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/vendors');
  });
});

// ============================================================
// 9. EDGE CASES
// ============================================================
test.describe('Vendors — Edge Cases', () => {
  test('opening and closing dialog multiple times should work', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /add vendor/i }).click();
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
      await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
      await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
    }
  });

  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /vendor details/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /vendor list/i }).click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /vendor management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 10. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Vendors — Console Error Checks', () => {
  test('vendors page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToVendors(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /vendors:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('vendors page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToVendors(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add vendor dialog should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddVendor(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add vendor:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('submitting invalid form should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddVendor(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /add/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching tabs should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToVendors(page);
    await page.getByRole('tab', { name: /vendor details/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /vendor list/i }).click();
    await page.waitForTimeout(500);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during tab switch:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
