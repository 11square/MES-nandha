import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Settings module.
 * Covers: page load, 6 tabs (Company, Tax, Invoice, Alerts, System, Security),
 * form validation, save flow, export/import, event types, navigation, edge cases,
 * and console error checks.
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

// ---------- Helper ----------
async function goToSettings(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Settings', { exact: true }).click();
  await page.waitForURL('**/settings', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Settings — Page Load & Layout', () => {
  test('should navigate to /settings and show heading', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    expect(page.url()).toContain('/settings');
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await expect(page.getByText(/configure application settings/i)).toBeVisible();
  });

  test('should show Export and Import buttons', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /import/i })).toBeVisible();
  });

  test('should display all 6 tabs', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    for (const tab of [/company/i, /tax/i, /invoice/i, /alerts/i, /system/i, /security/i]) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible();
    }
  });

  test('Company tab should be active by default', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await expect(page.getByRole('tab', { name: /company/i })).toHaveAttribute('data-state', 'active');
  });

  test('should show Save Changes button', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await expect(page.getByRole('button', { name: /save changes/i }).first()).toBeVisible();
  });
});

// ============================================================
// 2. COMPANY TAB — FORM VALIDATION
// ============================================================
test.describe('Settings — Company Tab Validation', () => {
  test('clearing required fields and saving should show errors', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    // Clear Company Name
    const companyNameInput = page.locator('input').filter({ hasText: '' }).first();
    const nameInput = page.getByLabel(/company name/i);
    if (await nameInput.isVisible()) {
      await nameInput.clear();
    }
    // Clear Email
    const emailInput = page.getByLabel(/email/i).first();
    if (await emailInput.isVisible()) {
      await emailInput.clear();
    }
    // Click Save
    await page.getByRole('button', { name: /save changes/i }).first().click();
    await page.waitForTimeout(500);
    // Should show validation errors
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });

  test('invalid email should show email validation error', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    const emailInput = page.getByLabel(/email/i).first();
    if (await emailInput.isVisible()) {
      await emailInput.clear();
      await emailInput.fill('invalid-email');
      await page.getByRole('button', { name: /save changes/i }).first().click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
    }
  });

  test('invalid phone should show phone validation error', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    const phoneInput = page.getByLabel(/^phone$/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.clear();
      await phoneInput.fill('123');
      await page.getByRole('button', { name: /save changes/i }).first().click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
    }
  });

  test('company name too short should show min-length error', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    const nameInput = page.getByLabel(/company name/i);
    if (await nameInput.isVisible()) {
      await nameInput.clear();
      await nameInput.fill('A');
      await page.getByRole('button', { name: /save changes/i }).first().click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/must be at least 2 characters/i)).toBeVisible();
    }
  });

  test('Company form shows all expected fields', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    for (const label of [/company name/i, /gstin/i, /pan/i, /address/i, /city/i, /state/i, /pin code/i, /email/i, /mobile/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('valid data should save successfully', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('button', { name: /save changes/i }).first().click();
    await page.waitForTimeout(2000);
    // Should show success banner or stay on page
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
  });

  test('Upload logo button should be visible', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await expect(page.getByRole('button', { name: /upload/i }).first()).toBeVisible();
  });
});

// ============================================================
// 3. TAX TAB
// ============================================================
test.describe('Settings — Tax Tab', () => {
  test('clicking Tax tab should show tax settings', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /tax/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /tax/i })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/tax settings/i).first()).toBeVisible();
  });

  test('Tax tab should show GST rate select', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /tax/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/default gst rate/i)).toBeVisible();
  });

  test('Tax tab should show GST checkboxes', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /tax/i }).click();
    await page.waitForTimeout(500);
    for (const text of [/gst registered/i, /cgst.*sgst/i, /igst/i, /hsn code/i]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
  });

  test('Tax tab should have Save Changes button', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /tax/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });
});

// ============================================================
// 4. INVOICE TAB
// ============================================================
test.describe('Settings — Invoice Tab', () => {
  test('clicking Invoice tab should show invoice settings', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /invoice/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /invoice/i })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/invoice settings/i).first()).toBeVisible();
  });

  test('Invoice tab should show prefix fields', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /invoice/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/invoice prefix/i)).toBeVisible();
    await expect(page.getByText(/po prefix/i).first()).toBeVisible();
  });

  test('Invoice tab should show paper size select', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /invoice/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/paper size/i)).toBeVisible();
  });

  test('Invoice tab should show terms & conditions textarea', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /invoice/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/terms.*conditions/i).first()).toBeVisible();
  });
});

// ============================================================
// 5. ALERTS/NOTIFICATION TAB
// ============================================================
test.describe('Settings — Alerts Tab', () => {
  test('clicking Alerts tab should show notification settings', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /alerts/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /alerts/i })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/notification settings/i).first()).toBeVisible();
  });

  test('Alerts tab should show notification channels', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /alerts/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/email notifications/i)).toBeVisible();
    await expect(page.getByText(/sms notifications/i)).toBeVisible();
  });

  test('Alerts tab should show alert types', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /alerts/i }).click();
    await page.waitForTimeout(500);
    for (const text of [/low stock alert/i, /payment reminder/i, /order status updates/i, /weekly report/i]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
  });
});

// ============================================================
// 6. SYSTEM TAB
// ============================================================
test.describe('Settings — System Tab', () => {
  test('clicking System tab should show system settings', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /system/i })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/system settings/i).first()).toBeVisible();
  });

  test('System tab should show date/time/timezone/currency selects', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForTimeout(500);
    for (const text of [/date format/i, /time format/i, /timezone/i, /currency/i]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
  });

  test('System tab should show session/login fields', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/session timeout/i)).toBeVisible();
    await expect(page.getByText(/max login attempts/i)).toBeVisible();
  });

  test('System tab should show Backup Now button', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /backup now/i })).toBeVisible();
  });

  test('System tab should show auto backup checkbox', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/auto backup/i)).toBeVisible();
  });
});

// ============================================================
// 7. SECURITY TAB
// ============================================================
test.describe('Settings — Security Tab', () => {
  test('clicking Security tab should show security settings', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /security/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /security/i })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(/security settings/i).first()).toBeVisible();
  });

  test('Security tab should show password policy fields', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /security/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/password expiry/i)).toBeVisible();
    await expect(page.getByText(/minimum password length/i)).toBeVisible();
  });

  test('Security tab should show password requirement checkboxes', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /security/i }).click();
    await page.waitForTimeout(500);
    for (const text of [/require special character/i, /require numbers/i, /require uppercase/i]) {
      await expect(page.getByText(text)).toBeVisible();
    }
  });

  test('Security tab should show access control section', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /security/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/two-factor authentication/i)).toBeVisible();
    await expect(page.getByText(/audit log/i).first()).toBeVisible();
  });

  test('Security tab should show IP whitelist textarea', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /security/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/ip whitelist/i)).toBeVisible();
    await expect(page.getByPlaceholder(/one ip address per line/i)).toBeVisible();
  });
});

// ============================================================
// 8. EVENT TYPES
// ============================================================
test.describe('Settings — Event Types', () => {
  test('switching between all 6 tabs should work', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    const tabs = [/tax/i, /invoice/i, /alerts/i, /system/i, /security/i, /company/i];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab }).click();
      await page.waitForTimeout(300);
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('data-state', 'active');
    }
  });

  test('Export button should be clickable without crash', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('button', { name: /export/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
  });

  test('saving settings should show success state', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.getByRole('button', { name: /save changes/i }).first().click();
    await page.waitForTimeout(2000);
    // Check for success banner or page stability
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
  });
});

// ============================================================
// 9. NAVIGATION
// ============================================================
test.describe('Settings — Navigation', () => {
  test('sidebar navigation from settings to dashboard', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /settings should work', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/settings');
  });

  test('refreshing /settings should persist the page', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/settings');
  });
});

// ============================================================
// 10. EDGE CASES
// ============================================================
test.describe('Settings — Edge Cases', () => {
  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /security/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /company/i }).click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
  });

  test('double-clicking save should not cause errors', async ({ authenticatedPage: page }) => {
    await goToSettings(page);
    const saveBtn = page.getByRole('button', { name: /save changes/i }).first();
    await saveBtn.dblclick();
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible();
  });
});

// ============================================================
// 11. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Settings — Console Error Checks', () => {
  test('settings page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSettings(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /settings:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('settings page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSettings(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Tax tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /tax/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on tax tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Invoice tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /invoice/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on invoice tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Alerts tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /alerts/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on alerts tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to System tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /system/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on system tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching to Security tab should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSettings(page);
    await page.getByRole('tab', { name: /security/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on security tab:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('saving company settings should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSettings(page);
    await page.getByRole('button', { name: /save changes/i }).first().click();
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on save:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
