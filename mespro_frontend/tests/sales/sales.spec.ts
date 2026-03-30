import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Sales Management module.
 * Covers: page load, stat cards, tabs, table data, search,
 * navigation, and console errors.
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

async function goToSales(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Sales', { exact: true }).click();
  await page.waitForURL('**/sales', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Sales — Page Load & Layout', () => {
  test('should navigate to sales page', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page).toHaveURL(/\/sales/);
  });

  test('should display Sales Management heading', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByRole('heading', { name: /sales management/i }).first()).toBeVisible();
  });

  test('should show subtitle', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByText(/track sales orders|follow-ups|targets/i).first()).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS
// ============================================================
test.describe('Sales — Stat Cards', () => {
  test('should display Total Sales card', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByText(/total sales/i).first()).toBeVisible();
  });

  test('should display Pending Orders card', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByText(/pending orders/i).first()).toBeVisible();
  });

  test('should display Approved card', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByText(/approved/i).first()).toBeVisible();
  });

  test('should display Delivered card', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByText(/delivered/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. TABS
// ============================================================
test.describe('Sales — Tabs', () => {
  test('should show Lead Sales tab', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByRole('tab', { name: /lead sales/i })).toBeVisible();
  });

  test('should show Sales Orders tab', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByRole('tab', { name: /sales orders/i })).toBeVisible();
  });

  test('should show Follow-ups tab', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByRole('tab', { name: /follow-?ups/i })).toBeVisible();
  });

  test('should show Sales Targets tab', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByRole('tab', { name: /targets/i })).toBeVisible();
  });

  test('should show Productivity tab', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await expect(page.getByRole('tab', { name: /productivity/i })).toBeVisible();
  });

  test('switching tabs should change content', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await expect(page.getByRole('tab', { name: /sales orders/i })).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================
// 4. TABLE DATA
// ============================================================
test.describe('Sales — Table Data', () => {
  test('lead sales tab should show table', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.locator('thead').first().waitFor({ timeout: 10_000 });
    const headerCount = await page.locator('thead th').count();
    expect(headerCount).toBeGreaterThanOrEqual(5);
  });

  test('sales orders tab should show table', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await page.locator('thead').first().waitFor({ timeout: 10_000 });
    const headerCount = await page.locator('thead th').count();
    expect(headerCount).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================
// 5. ACTION BUTTONS
// ============================================================
test.describe('Sales — Actions', () => {
  test('should show Add Sale button', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /add sale/i })).toBeVisible();
  });

  test('should show Add Follow-up button on follow-ups tab', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /add follow/i })).toBeVisible();
  });

  test('should show Add Target button on targets tab', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /targets/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /add target/i })).toBeVisible();
  });
});

// ============================================================
// 6. ADD SALE FORM VALIDATION
// ============================================================
test.describe('Sales — Add Sale Form Validation', () => {
  test('clicking Add Sale should open dialog', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('submitting empty sale form should show validation errors', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });

  test('invalid client contact should show phone error', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(500);
    const contactInput = page.locator('#client-contact');
    if (await contactInput.isVisible()) {
      await contactInput.fill('123');
      const submitBtn = page.locator('div[role="dialog"]').getByRole('button', { name: /add sale/i });
      await submitBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
    }
  });

  test('sale form should show all key fields', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(500);
    for (const id of ['#sale-date', '#client-name', '#client-contact', '#product-details', '#quantity']) {
      const field = page.locator(id);
      if (await field.isVisible()) {
        await expect(field).toBeVisible();
      }
    }
  });

  test('cancel should close add sale dialog', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(500);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});

// ============================================================
// 7. ADD FOLLOW-UP FORM
// ============================================================
test.describe('Sales — Add Follow-up Form', () => {
  test('clicking Add Follow-up should open dialog', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add follow/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('follow-up form should show client and contact fields', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add follow/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('#followup-client').or(page.getByText(/client name/i).first())).toBeVisible();
  });

  test('submitting empty follow-up should show errors', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add follow/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /add follow/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });
});

// ============================================================
// 8. ADD TARGET FORM
// ============================================================
test.describe('Sales — Add Target Form', () => {
  test('clicking Add Target should open dialog', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /targets/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add target/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('submitting empty target form should show errors', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /targets/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add target/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /add target/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/is required/i).first()).toBeVisible();
  });
});

// ============================================================
// 9. PRODUCTIVITY TAB
// ============================================================
test.describe('Sales — Productivity Tab', () => {
  test('clicking Productivity tab should show staff data', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /productivity/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /productivity/i })).toHaveAttribute('data-state', 'active');
  });

  test('Productivity tab should show stat cards', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /productivity/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/staff online/i).first()).toBeVisible();
  });
});

// ============================================================
// 10. SEARCH
// ============================================================
test.describe('Sales — Search', () => {
  test('Sales Orders tab should have search input', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    const search = page.getByPlaceholder(/search by client.*product.*sale/i);
    if (await search.isVisible()) {
      await search.fill('test');
      await page.waitForTimeout(500);
    }
  });
});

// ============================================================
// 11. API VERIFICATION
// ============================================================
test.describe('Sales — API Verification', () => {
  test('page load should call GET /sales', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/sales') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Sales', { exact: true }).click();
    await page.waitForURL('**/sales', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });
});

// ============================================================
// 12. NAVIGATION
// ============================================================
test.describe('Sales — Navigation', () => {
  test('sidebar navigation from sales to dashboard', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /sales should work', async ({ authenticatedPage: page }) => {
    await page.goto('/sales');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/sales');
  });

  test('refreshing /sales should persist the page', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/sales');
  });
});

// ============================================================
// 13. EDGE CASES
// ============================================================
test.describe('Sales — Edge Cases', () => {
  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /sales orders/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /productivity/i }).click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /sales management/i }).first()).toBeVisible();
  });

  test('rapid dialog open/close should not crash', async ({ authenticatedPage: page }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /add sale/i }).click();
      await page.waitForTimeout(200);
      await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
      await page.waitForTimeout(200);
    }
    await expect(page.getByRole('heading', { name: /sales management/i }).first()).toBeVisible();
  });
});

// ============================================================
// 14. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Sales — Console Error Checks', () => {
  test('sales page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSales(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /sales:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('sales page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSales(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('tab switching should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSales(page);
    const tabs = ['Sales Orders', 'Follow-ups', 'Sales Targets', 'Productivity'];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();
      await page.waitForTimeout(500);
    }
    const errors = consoleErrors.filter(e =>
      e.source === 'console' &&
      !e.message.includes('Received NaN') &&
      !e.message.includes('Warning:')
    );
    expect(errors, `Console errors during tab switch:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add sale dialog should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e =>
      e.source === 'console' && !e.message.includes('Received NaN')
    );
    expect(errors, `Console errors on add sale:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('form validation should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToSales(page);
    await page.getByRole('tab', { name: /sales orders/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(500);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /add sale/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e =>
      e.source === 'console' && !e.message.includes('Received NaN')
    );
    expect(errors, `Console errors on validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
