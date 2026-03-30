import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Client Management module.
 * Covers: page load, stat cards, tabs, client cards/grid,
 * search, add client, and console errors.
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

async function goToClients(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Clients', { exact: false }).click();
  await page.waitForURL('**/clients', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Clients — Page Load & Layout', () => {
  test('should navigate to clients page', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page).toHaveURL(/\/clients/);
  });

  test('should display Client Management heading', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByRole('heading', { name: /client management/i }).first()).toBeVisible();
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByPlaceholder(/search/i).first()).toBeVisible();
  });

  test('should show Add New Client button', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByRole('button', { name: /add new client/i })).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS
// ============================================================
test.describe('Clients — Stat Cards', () => {
  test('should display Total Clients', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByText(/total clients/i).first()).toBeVisible();
  });

  test('should display Total Sales', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByText(/total sales/i).first()).toBeVisible();
  });

  test('should display Active Orders', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByText(/active orders/i).first()).toBeVisible();
  });

  test('should display Follow-ups', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByText(/follow.?ups/i).first()).toBeVisible();
  });
});

// ============================================================
// 3. TABS
// ============================================================
test.describe('Clients — Tabs', () => {
  test('should show Clients tab', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByRole('tab', { name: /clients/i }).first()).toBeVisible();
  });

  test('should show Client Detail tab', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByRole('tab', { name: /client detail/i })).toBeVisible();
  });

  test('should show Outstandings tab', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await expect(page.getByRole('tab', { name: /outstandings/i })).toBeVisible();
  });

  test('switching tabs should work', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await page.getByRole('tab', { name: /outstandings/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('tab', { name: /outstandings/i })).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================
// 4. CLIENT DATA
// ============================================================
test.describe('Clients — Data Display', () => {
  test('should show client entries (cards or rows)', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await page.waitForTimeout(1500);
    const items = page.locator('[class*="card"], [class*="Card"], tbody tr, .grid > div');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 5. ADD CLIENT FORM
// ============================================================
test.describe('Clients — Add Client', () => {
  test('clicking Add New Client should open form/dialog', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    await page.getByRole('button', { name: /add new client/i }).click();
    await page.waitForTimeout(500);
    const dialog = page.locator('div[role="dialog"]');
    const heading = page.getByRole('heading', { name: /add|new|client/i });
    const dialogVisible = await dialog.isVisible().catch(() => false);
    const headingVisible = await heading.isVisible().catch(() => false);
    expect(dialogVisible || headingVisible).toBeTruthy();
  });
});

// ============================================================
// 6. SEARCH
// ============================================================
test.describe('Clients — Search', () => {
  test('search input should accept text', async ({ authenticatedPage: page }) => {
    await goToClients(page);
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.click();
    await searchInput.fill('Test Client');
    await expect(searchInput).toHaveValue('Test Client');
  });
});

// ============================================================
// 7. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Clients — Console Error Checks', () => {
  test('page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToClients(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToClients(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('tab switching should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToClients(page);
    for (const tabName of [/client detail/i, /outstandings/i, /clients/i]) {
      await page.getByRole('tab', { name: tabName }).click();
      await page.waitForTimeout(500);
    }
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
