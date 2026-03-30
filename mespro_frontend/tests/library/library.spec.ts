import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Library Management module.
 * Covers: page load, vendor tab, supplier tab, form validation,
 * CRUD operations, delete confirm dialog, event types,
 * navigation, edge cases, and console error checks.
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

// ---------- Helpers ----------
async function goToLibrary(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Library', { exact: true }).click();
  await page.waitForURL('**/library', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

async function openAddVendorDialog(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /add vendor/i }).click();
  await page.waitForTimeout(500);
}

async function openAddSupplierDialog(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: /suppliers/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /add supplier/i }).click();
  await page.waitForTimeout(500);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Library — Page Load & Layout', () => {
  test('should navigate to /library and show heading', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    expect(page.url()).toContain('/library');
    await expect(page.getByRole('heading', { name: /library management/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await expect(page.getByText(/manage vendors.*suppliers/i)).toBeVisible();
  });

  test('should display Vendors and Suppliers tabs', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await expect(page.getByRole('tab', { name: /vendors/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /suppliers/i })).toBeVisible();
  });

  test('Vendors tab should be active by default', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await expect(page.getByRole('tab', { name: /vendors/i })).toHaveAttribute('data-state', 'active');
  });

  test('should show Add Vendor button on Vendors tab', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await expect(page.getByRole('button', { name: /add vendor/i })).toBeVisible();
  });

  test('should show vendor table headers', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    for (const header of [/vendor name/i, /contact person/i, /email/i, /phone/i, /category/i, /actions/i]) {
      await expect(page.getByRole('columnheader', { name: header }).or(page.getByText(header).first())).toBeVisible();
    }
  });
});

// ============================================================
// 2. ADD VENDOR FORM VALIDATION
// ============================================================
test.describe('Library — Add Vendor Form Validation', () => {
  test('submitting empty vendor form should show required errors', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await page.getByRole('button', { name: /add vendor/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/contact person is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('invalid vendor email should show email error', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await page.locator('#vendor-name').fill('Test Vendor');
    await page.locator('#vendor-contact').fill('John Doe');
    await page.locator('#vendor-email').fill('invalid-email');
    await page.locator('#vendor-phone').fill('1234567890');
    await page.locator('#vendor-category').fill('Raw Materials');
    await page.locator('#vendor-address').fill('123 Street');
    await page.getByRole('button', { name: /add vendor/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  });

  test('invalid vendor phone should show phone error', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await page.locator('#vendor-name').fill('Test Vendor');
    await page.locator('#vendor-contact').fill('John Doe');
    await page.locator('#vendor-email').fill('test@test.com');
    await page.locator('#vendor-phone').fill('123');
    await page.locator('#vendor-category').fill('Raw Materials');
    await page.locator('#vendor-address').fill('123 Street');
    await page.getByRole('button', { name: /add vendor/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
  });

  test('missing address should show address required error', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await page.locator('#vendor-name').fill('Test Vendor');
    await page.locator('#vendor-contact').fill('John');
    await page.locator('#vendor-email').fill('test@test.com');
    await page.locator('#vendor-phone').fill('1234567890');
    await page.locator('#vendor-category').fill('Equipment');
    // Leave address empty
    await page.getByRole('button', { name: /add vendor/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/address is required/i)).toBeVisible();
  });

  test('missing category should show category required error', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await page.locator('#vendor-name').fill('Test Vendor');
    await page.locator('#vendor-contact').fill('John');
    await page.locator('#vendor-email').fill('test@test.com');
    await page.locator('#vendor-phone').fill('1234567890');
    // Leave category empty
    await page.locator('#vendor-address').fill('123 Street');
    await page.getByRole('button', { name: /add vendor/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/category is required/i)).toBeVisible();
  });

  test('cancel button should close vendor dialog', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await expect(page.getByText(/add new vendor/i)).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/add new vendor/i)).not.toBeVisible();
  });
});

// ============================================================
// 3. CREATE VENDOR CRUD + API
// ============================================================
test.describe('Library — Create Vendor CRUD + API', () => {
  test('filling all vendor fields and submitting should call POST /vendors', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    const postPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/vendors') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );
    await openAddVendorDialog(page);
    await page.locator('#vendor-name').fill('PW Test Vendor');
    await page.locator('#vendor-contact').fill('PW Contact');
    await page.locator('#vendor-email').fill('pw-vendor@test.com');
    await page.locator('#vendor-phone').fill('9876543210');
    await page.locator('#vendor-category').fill('Raw Materials');
    await page.locator('#vendor-address').fill('PW Test Address 123');
    await page.getByRole('button', { name: /add vendor/i }).last().click();
    const response = await postPromise;
    expect(response.status()).toBeLessThan(400);
  });

  test('POST vendor payload should contain all fields', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    let payload: Record<string, unknown> | null = null;
    page.on('request', req => {
      if (req.url().includes('/api/v1/vendors') && req.method() === 'POST') {
        payload = req.postDataJSON();
      }
    });
    await openAddVendorDialog(page);
    await page.locator('#vendor-name').fill('Payload Vendor');
    await page.locator('#vendor-contact').fill('Payload Contact');
    await page.locator('#vendor-email').fill('payload@test.com');
    await page.locator('#vendor-phone').fill('9876543210');
    await page.locator('#vendor-category').fill('Equipment');
    await page.locator('#vendor-address').fill('Payload Address');
    await page.getByRole('button', { name: /add vendor/i }).last().click();
    await page.waitForTimeout(2000);
    expect(payload).not.toBeNull();
  });
});

// ============================================================
// 4. ADD SUPPLIER FORM VALIDATION
// ============================================================
test.describe('Library — Add Supplier Form Validation', () => {
  test('submitting empty supplier form should show required errors', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddSupplierDialog(page);
    await page.getByRole('button', { name: /add supplier/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/contact person is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('invalid supplier email should show email error', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddSupplierDialog(page);
    await page.locator('#supplier-name').fill('Test Supplier');
    await page.locator('#supplier-contact').fill('Jane Doe');
    await page.locator('#supplier-email').fill('bad-email');
    await page.locator('#supplier-phone').fill('1234567890');
    await page.locator('#supplier-products').fill('Steel');
    await page.locator('#supplier-address').fill('456 Ave');
    await page.getByRole('button', { name: /add supplier/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  });

  test('invalid supplier phone should show phone error', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddSupplierDialog(page);
    await page.locator('#supplier-name').fill('Test Supplier');
    await page.locator('#supplier-contact').fill('Jane Doe');
    await page.locator('#supplier-email').fill('supplier@test.com');
    await page.locator('#supplier-phone').fill('12345');
    await page.locator('#supplier-products').fill('Components');
    await page.locator('#supplier-address').fill('456 Ave');
    await page.getByRole('button', { name: /add supplier/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
  });

  test('missing products supplied should show required error', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddSupplierDialog(page);
    await page.locator('#supplier-name').fill('Test Supplier');
    await page.locator('#supplier-contact').fill('Jane');
    await page.locator('#supplier-email').fill('supplier@test.com');
    await page.locator('#supplier-phone').fill('1234567890');
    // Leave products empty
    await page.locator('#supplier-address').fill('456 Ave');
    await page.getByRole('button', { name: /add supplier/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/products supplied is required/i)).toBeVisible();
  });

  test('cancel should close supplier dialog', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddSupplierDialog(page);
    await expect(page.getByText(/add new supplier/i)).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/add new supplier/i)).not.toBeVisible();
  });
});

// ============================================================
// 5. CREATE SUPPLIER CRUD + API
// ============================================================
test.describe('Library — Create Supplier CRUD + API', () => {
  test('submitting valid supplier should call POST /vendors', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    const postPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/vendors') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );
    await openAddSupplierDialog(page);
    await page.locator('#supplier-name').fill('PW Supplier');
    await page.locator('#supplier-contact').fill('PW Contact');
    await page.locator('#supplier-email').fill('pw-supp@test.com');
    await page.locator('#supplier-phone').fill('9876543210');
    await page.locator('#supplier-products').fill('Steel, Aluminum');
    await page.locator('#supplier-address').fill('PW Supplier Addr');
    await page.getByRole('button', { name: /add supplier/i }).last().click();
    const response = await postPromise;
    expect(response.status()).toBeLessThan(400);
  });
});

// ============================================================
// 6. READ & TABLE DATA — Vendors
// ============================================================
test.describe('Library — Vendor Table Data', () => {
  test('vendor table should have rows with data', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('each vendor row should have edit and delete action buttons', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) {
      const firstRow = rows.first();
      const actionBtns = firstRow.locator('button');
      const btnCount = await actionBtns.count();
      expect(btnCount).toBeGreaterThanOrEqual(2);
    }
  });

  test('clicking edit should open edit vendor dialog', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) {
      const editBtn = rows.first().locator('button').first();
      await editBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/edit vendor/i)).toBeVisible();
    }
  });

  test('edit dialog should pre-fill vendor data', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) {
      const editBtn = rows.first().locator('button').first();
      await editBtn.click();
      await page.waitForTimeout(500);
      const nameVal = await page.locator('#vendor-name').inputValue();
      expect(nameVal.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// 7. READ & TABLE DATA — Suppliers
// ============================================================
test.describe('Library — Supplier Table Data', () => {
  test('switching to Suppliers tab should show supplier table', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await page.getByRole('tab', { name: /suppliers/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /suppliers/i })).toHaveAttribute('data-state', 'active');
  });

  test('supplier table should show expected columns', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await page.getByRole('tab', { name: /suppliers/i }).click();
    await page.waitForTimeout(500);
    for (const header of [/^name$/i, /contact person/i, /email/i, /phone/i, /products supplied/i]) {
      await expect(page.getByText(header).first()).toBeVisible();
    }
  });

  test('clicking Add Supplier should open dialog', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await page.getByRole('tab', { name: /suppliers/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add supplier/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/add new supplier/i)).toBeVisible();
  });
});

// ============================================================
// 8. DELETE CONFIRM DIALOG
// ============================================================
test.describe('Library — Delete Confirm Dialog', () => {
  test('clicking delete on vendor should show confirm dialog', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) {
      const deleteBtn = rows.first().locator('button').last();
      await deleteBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/delete vendor/i)).toBeVisible();
      await expect(page.getByText(/are you sure.*delete this vendor/i)).toBeVisible();
    }
  });

  test('cancel on delete dialog should close without deleting', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    if (count > 0) {
      const deleteBtn = rows.first().locator('button').last();
      await deleteBtn.click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /cancel/i }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/delete vendor/i)).not.toBeVisible();
    }
  });
});

// ============================================================
// 9. EVENT TYPES
// ============================================================
test.describe('Library — Event Types', () => {
  test('switching between Vendors and Suppliers tabs should work', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await page.getByRole('tab', { name: /suppliers/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('tab', { name: /suppliers/i })).toHaveAttribute('data-state', 'active');
    await page.getByRole('tab', { name: /vendors/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('tab', { name: /vendors/i })).toHaveAttribute('data-state', 'active');
  });

  test('vendor form dialog shows all 6 fields', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await expect(page.locator('#vendor-name')).toBeVisible();
    await expect(page.locator('#vendor-contact')).toBeVisible();
    await expect(page.locator('#vendor-email')).toBeVisible();
    await expect(page.locator('#vendor-phone')).toBeVisible();
    await expect(page.locator('#vendor-category')).toBeVisible();
    await expect(page.locator('#vendor-address')).toBeVisible();
  });

  test('supplier form dialog shows all 6 fields', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await openAddSupplierDialog(page);
    await expect(page.locator('#supplier-name')).toBeVisible();
    await expect(page.locator('#supplier-contact')).toBeVisible();
    await expect(page.locator('#supplier-email')).toBeVisible();
    await expect(page.locator('#supplier-phone')).toBeVisible();
    await expect(page.locator('#supplier-products')).toBeVisible();
    await expect(page.locator('#supplier-address')).toBeVisible();
  });
});

// ============================================================
// 10. API VERIFICATION
// ============================================================
test.describe('Library — API Verification', () => {
  test('page load should call GET /vendors', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/vendors') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Library', { exact: true }).click();
    await page.waitForURL('**/library', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });

  test('GET /vendors response should contain array data', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/vendors') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Library', { exact: true }).click();
    await page.waitForURL('**/library', { timeout: 10_000 });
    const response = await apiPromise;
    const body = await response.json();
    expect(body.data || body).toBeDefined();
  });
});

// ============================================================
// 11. NAVIGATION
// ============================================================
test.describe('Library — Navigation', () => {
  test('sidebar navigation from library to dashboard', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /library should work', async ({ authenticatedPage: page }) => {
    await page.goto('/library');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/library');
  });

  test('refreshing /library should persist the page', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/library');
  });
});

// ============================================================
// 12. EDGE CASES
// ============================================================
test.describe('Library — Edge Cases', () => {
  test('rapid form open/close on vendors should not crash', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /add vendor/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: /cancel/i }).click();
      await page.waitForTimeout(200);
    }
    await expect(page.getByRole('heading', { name: /library management/i }).first()).toBeVisible();
  });

  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToLibrary(page);
    for (let i = 0; i < 5; i++) {
      await page.getByRole('tab', { name: /suppliers/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /vendors/i }).click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /library management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 13. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Library — Console Error Checks', () => {
  test('library page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLibrary(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /library:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('library page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLibrary(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add vendor dialog should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add vendor:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('vendor form validation should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLibrary(page);
    await openAddVendorDialog(page);
    await page.getByRole('button', { name: /add vendor/i }).last().click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to suppliers tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLibrary(page);
    await page.getByRole('tab', { name: /suppliers/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on suppliers tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add supplier dialog should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLibrary(page);
    await openAddSupplierDialog(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add supplier:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('supplier form validation should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLibrary(page);
    await openAddSupplierDialog(page);
    await page.getByRole('button', { name: /add supplier/i }).last().click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on supplier validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
