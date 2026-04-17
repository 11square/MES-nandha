import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Vendor Management module.
 * Covers: page load, card layout, form validation, CRUD operations,
 * vendor detail page, outstanding balance, API verification, navigation,
 * edge cases, and console errors.
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
// 1. PAGE LOAD & LAYOUT (Card-based UI)
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

  test('should show stats cards row', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await expect(page.getByText('Total Vendors').first()).toBeVisible();
    await expect(page.getByText(/total purchases/i).first()).toBeVisible();
    await expect(page.getByText(/outstanding/i).first()).toBeVisible();
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await expect(page.getByPlaceholder(/search vendors/i)).toBeVisible();
  });

  test('should show Add Vendor button', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await expect(page.getByRole('button', { name: /add vendor/i })).toBeVisible();
  });

  test('should show vendor cards in grid', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    // Wait for at least one vendor card to appear
    const cards = page.locator('.grid .bg-white.rounded-md.border');
    await cards.first().waitFor({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('vendor card should show name, status badge, and category badge', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    // Name
    await expect(card.locator('h3')).not.toBeEmpty();
    // Should have badges (status + category) - shadcn uses data-slot="badge"
    const badges = card.locator('[data-slot="badge"]');
    expect(await badges.count()).toBeGreaterThanOrEqual(2);
  });

  test('vendor card should show View, Edit, Delete buttons', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    await expect(card.getByRole('button', { name: /view/i })).toBeVisible();
    await expect(card.getByRole('button', { name: /edit/i })).toBeVisible();
    // Delete button (trash icon, no text)
    const deleteBtn = card.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
    expect(await deleteBtn.count()).toBe(1);
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
// 3. CREATE VENDOR WITH OUTSTANDING BALANCE
// ============================================================
test.describe('Vendors — Create Vendor (CRUD + Outstanding)', () => {
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

  test('should create vendor with outstanding balance and verify it in stats', async ({ authenticatedPage: page }) => {
    const createPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/vendors') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );

    await openAddVendor(page);
    const dialog = page.locator('div[role="dialog"]');

    await dialog.locator('#vendor-name').fill('Outstanding Test Vendor');
    await dialog.locator('#vendor-contact').fill('Jane Doe');
    await dialog.locator('#vendor-email').fill('outtest@vendor.com');
    await dialog.locator('#vendor-phone').fill('9123456789');
    await dialog.locator('#vendor-category').fill('Services');
    await dialog.locator('#vendor-address').fill('456 Test Road');
    await dialog.locator('#vendor-opening-balance').fill('7500');

    await dialog.getByRole('button', { name: /add/i }).click();

    const response = await createPromise;
    expect(response.status()).toBeLessThan(400);
    const body = await response.json();
    // Backend hook should set outstanding_amount = opening_balance
    expect(Number(body.data.outstanding_amount)).toBe(7500);
  });
});

// ============================================================
// 4. CARD DATA
// ============================================================
test.describe('Vendors — Card Data', () => {
  test('vendor cards should display in grid', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const cards = page.locator('.grid .bg-white.rounded-md.border');
    await cards.first().waitFor({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('vendor card should show contact info (phone, email, address)', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    // Card should have at least 3 info rows with icons
    const infoRows = card.locator('.space-y-0\\.5 > div');
    expect(await infoRows.count()).toBe(3);
  });

  test('vendor card should show purchase stats row', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    await expect(card.getByText(/purchases:/i)).toBeVisible();
    await expect(card.getByText(/amount:/i)).toBeVisible();
    await expect(card.getByText(/outstanding:/i)).toBeVisible();
  });

  test('search should filter vendor cards', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const cards = page.locator('.grid .bg-white.rounded-md.border');
    await cards.first().waitFor({ timeout: 10_000 });
    const totalBefore = await cards.count();
    // Type a search that likely won't match all vendors
    await page.getByPlaceholder(/search vendors/i).fill('zzzzzznotavendor');
    await page.waitForTimeout(500);
    const totalAfter = await cards.count();
    expect(totalAfter).toBeLessThan(totalBefore);
  });
});

// ============================================================
// 5. VENDOR DETAIL PAGE (Navigation + Content)
// ============================================================
test.describe('Vendors — Vendor Detail Page', () => {
  test('clicking a vendor card should navigate to detail page', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    await card.click();
    await page.waitForURL('**/vendors/*', { timeout: 10_000 });
    expect(page.url()).toMatch(/\/vendors\/\d+/);
  });

  test('clicking View button should navigate to detail page', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    await card.getByRole('button', { name: /view/i }).click();
    await page.waitForURL('**/vendors/*', { timeout: 10_000 });
    expect(page.url()).toMatch(/\/vendors\/\d+/);
  });

  test('detail page should show vendor name and back button', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    const vendorName = await card.locator('h3').textContent();
    await card.click();
    await page.waitForURL('**/vendors/*', { timeout: 10_000 });
    await page.waitForTimeout(1000);
    // Should show vendor name
    await expect(page.getByText(vendorName!).first()).toBeVisible();
    // Should show Back button
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
  });

  test('detail page should show stat cards', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    await card.click();
    await page.waitForURL('**/vendors/*', { timeout: 10_000 });
    await page.waitForTimeout(1000);
    await expect(page.getByText('Total Purchases').first()).toBeVisible();
    await expect(page.getByText('Total Amount').first()).toBeVisible();
    await expect(page.getByText('Outstanding').first()).toBeVisible();
  });

  test('detail page should show tabs (Details, Purchases, Outstanding, Transactions)', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    await card.click();
    await page.waitForURL('**/vendors/*', { timeout: 10_000 });
    await page.waitForTimeout(1000);
    await expect(page.getByRole('tab', { name: /details/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /purchases/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /outstanding/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /transactions/i })).toBeVisible();
  });

  test('back button should return to vendors list', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    await card.click();
    await page.waitForURL('**/vendors/*', { timeout: 10_000 });
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /back/i }).click();
    await page.waitForURL('**/vendors', { timeout: 10_000 });
    expect(page.url()).toMatch(/\/vendors$/);
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

  test('clicking Edit on card should open edit dialog', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const cards = page.locator('.grid .bg-white.rounded-md.border');
    await cards.first().waitFor({ timeout: 10_000 });
    // Click the Edit button on the first card
    await cards.first().getByRole('button', { name: /edit/i }).click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/edit vendor/i)).toBeVisible();
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

  test('empty search then clear should show all vendors again', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    const cards = page.locator('.grid .bg-white.rounded-md.border');
    await cards.first().waitFor({ timeout: 10_000 });
    const totalBefore = await cards.count();
    await page.getByPlaceholder(/search vendors/i).fill('zzzzzznotavendor');
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/search vendors/i).fill('');
    await page.waitForTimeout(500);
    const totalAfter = await cards.count();
    expect(totalAfter).toBe(totalBefore);
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

  test('navigating to detail page should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToVendors(page);
    const card = page.locator('.grid .bg-white.rounded-md.border').first();
    await card.waitFor({ timeout: 10_000 });
    await card.click();
    await page.waitForURL('**/vendors/*', { timeout: 10_000 });
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on vendor detail:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});

// ============================================================
// 11. CLEANUP — Delete test vendors
// ============================================================
test.describe('Vendors — Cleanup', () => {
  test('should delete test vendors created during tests', async ({ authenticatedPage: page }) => {
    await goToVendors(page);
    await page.waitForTimeout(1000);

    for (const name of ['Playwright Vendor', 'Outstanding Test Vendor']) {
      let cards = page.locator('.grid .bg-white.rounded-md.border').filter({ hasText: name });
      while (await cards.count() > 0) {
        const deletePromise = page.waitForResponse(
          resp => resp.url().includes('/api/v1/vendors') && resp.request().method() === 'DELETE',
          { timeout: 10_000 }
        );
        await cards.first().locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();
        // Confirm deletion
        await page.getByRole('button', { name: /delete/i }).last().click();
        const resp = await deletePromise;
        expect(resp.status()).toBeLessThan(400);
        await page.waitForTimeout(500);
        // Re-query after deletion
        cards = page.locator('.grid .bg-white.rounded-md.border').filter({ hasText: name });
      }
    }
  });
});
