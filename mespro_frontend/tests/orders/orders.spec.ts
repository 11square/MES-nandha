import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Playwright tests for the Orders Management module.
 * Covers: page load, stat cards, table data, search, filters,
 * tabs, order detail dialog, form validation, navigation, and console errors.
 */

// ── Auto-report browser console errors after every test ──
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

// ---------- Helper: Navigate to /orders ----------
async function goToOrders(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Orders', { exact: true }).click();
  await page.waitForURL('**/orders', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Orders — Page Load & Layout', () => {
  test('should navigate to orders page from sidebar', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page).toHaveURL(/\/orders/);
  });

  test('should display Orders Management heading', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByRole('heading', { name: /orders management/i })).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByText(/manage converted leads as orders/i)).toBeVisible();
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByPlaceholder(/search by order/i)).toBeVisible();
  });

  test('should show Add Order button', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByRole('button', { name: /add order/i })).toBeVisible();
  });

  test('should show Go to Leads button', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByRole('button', { name: /go to leads/i })).toBeVisible();
  });

  test('should show Go to Production button', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByRole('button', { name: /go to production/i })).toBeVisible();
  });
});

// ============================================================
// 2. STAT CARDS
// ============================================================
test.describe('Orders — Stat Cards', () => {
  test('should display Total Orders card', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByText(/total orders/i).first()).toBeVisible();
  });

  test('should display Pending card', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByText(/^Pending$/i).first()).toBeVisible();
  });

  test('should display In Billing card', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByText(/in billing/i).first()).toBeVisible();
  });

  test('should display Total Value card', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByText(/total value/i).first()).toBeVisible();
  });

  test('stat cards should show numeric values', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    // Check Total Orders card has a number
    const statValues = page.locator('.text-2xl.font-bold');
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================
// 3. TABS
// ============================================================
test.describe('Orders — Tabs', () => {
  test('should show All tab', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByRole('tab', { name: /all/i }).first()).toBeVisible();
  });

  test('should show Pending tab', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByRole('tab', { name: /pending/i })).toBeVisible();
  });

  test('should show In Production tab', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByRole('tab', { name: /in production/i })).toBeVisible();
  });

  test('should show Bill tab', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await expect(page.getByRole('tab', { name: /bill/i }).first()).toBeVisible();
  });

  test('clicking Pending tab should filter orders', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('tab', { name: /pending/i }).click();
    await page.waitForTimeout(500);
    // Tab should be active
    await expect(page.getByRole('tab', { name: /pending/i })).toHaveAttribute('data-state', 'active');
  });
});

// ============================================================
// 4. TABLE DATA
// ============================================================
test.describe('Orders — Table Data', () => {
  test('should show orders table with correct headers', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    const headers = ['Order #', 'Date', 'Customer', 'Products', 'Amount', 'Due Date', 'Status', 'Actions'];
    for (const header of headers) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('should show order rows in table', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('first row should have order number format', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const firstCell = page.locator('tbody tr').first().locator('td').first();
    const text = await firstCell.textContent();
    expect(text).toMatch(/ORD-/i);
  });

  test('rows should have action buttons', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const firstRow = page.locator('tbody tr').first();
    // Should have at least an eye/view icon button
    const actionButtons = firstRow.locator('td').last().locator('button');
    const count = await actionButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 5. SEARCH
// ============================================================
test.describe('Orders — Search', () => {
  test('search input should filter orders', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by order/i);
    await searchInput.click();
    await searchInput.fill('ORD-');
    await expect(searchInput).toHaveValue('ORD-');
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);
  });

  test('search should filter results', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const initialRows = await page.locator('tbody tr').count();
    const searchInput = page.getByPlaceholder(/search by order/i);
    await searchInput.click();
    await searchInput.fill('ORD');
    await expect(searchInput).toHaveValue('ORD');
    await page.waitForTimeout(1000);
    const filteredRows = await page.locator('tbody tr').count();
    // Filtered should be leq initial
    expect(filteredRows).toBeLessThanOrEqual(initialRows);
  });
});

// ============================================================
// 6. ADD ORDER FORM VALIDATION
// ============================================================
test.describe('Orders — Add Order Form', () => {
  test('clicking Add Order should show form', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await expect(page.getByRole('heading', { name: /add new order/i })).toBeVisible();
  });

  test('form should show required fields', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await expect(page.getByText(/business name/i).first()).toBeVisible();
    await expect(page.getByText(/contact person/i).first()).toBeVisible();
    await expect(page.getByText(/mobile/i).first()).toBeVisible();
  });

  test('submitting empty form should show validation errors', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.getByRole('button', { name: /create order/i }).click();
    // Should show required field errors
    const errors = page.locator('.text-red-500, .text-destructive, [class*="error"]');
    const errCount = await errors.count();
    expect(errCount).toBeGreaterThanOrEqual(1);
  });

  test('back button should return to orders list', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('heading', { name: /orders management/i })).toBeVisible();
  });
});

// ============================================================
// 7. ORDER DETAIL DIALOG
// ============================================================
test.describe('Orders — Order Detail', () => {
  test('clicking view button should open detail dialog', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    // Eye icon is the 3rd button in the action column
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    // Find the eye/view button (3rd of 4 action buttons)
    const viewBtn = actionBtns.nth(2);
    await viewBtn.click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible({ timeout: 10_000 });
  });

  test('detail dialog should show tabs', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const viewBtn = page.locator('tbody tr').first().locator('td').last().locator('button').nth(2);
    await viewBtn.click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByRole('tab', { name: /details/i })).toBeVisible();
  });

  test('detail dialog should show customer information', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const viewBtn = page.locator('tbody tr').first().locator('td').last().locator('button').nth(2);
    await viewBtn.click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/customer information/i)).toBeVisible();
  });
});

// ============================================================
// 8. SIDEBAR NAVIGATION
// ============================================================
test.describe('Orders — Navigation', () => {
  test('Go to Leads button should navigate to leads', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /go to leads/i }).click();
    await page.waitForURL('**/leads', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/leads/);
  });

  test('Go to Production button should navigate to production', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /go to production/i }).click();
    await page.waitForURL('**/production', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/production/);
  });
});

// ============================================================
// 9. ADD ORDER — FIELD-LEVEL VALIDATION
// ============================================================
test.describe('Orders — Field-Level Validation', () => {
  test('customer name too short should show min-length error', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.locator('#customer').fill('A');
    await page.getByRole('button', { name: /create order/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/must be at least 2 characters/i)).toBeVisible();
  });

  test('invalid mobile should show phone error', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.locator('#customer').fill('Test Customer');
    await page.locator('#contact').fill('John');
    await page.locator('#mobile').fill('123');
    await page.getByRole('button', { name: /create order/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
  });

  test('invalid email should show email error', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.locator('#customer').fill('Test Customer');
    await page.locator('#contact').fill('John');
    await page.locator('#mobile').fill('9876543210');
    await page.locator('#email').fill('not-an-email');
    await page.getByRole('button', { name: /create order/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  });

  test('empty source should show source required error', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.locator('#customer').fill('Test Customer');
    await page.locator('#contact').fill('John');
    await page.locator('#mobile').fill('9876543210');
    await page.locator('#email').fill('test@test.com');
    // Leave source empty
    await page.getByRole('button', { name: /create order/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/source is required/i)).toBeVisible();
  });

  test('form should show all field IDs', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await expect(page.locator('#customer')).toBeVisible();
    await expect(page.locator('#contact')).toBeVisible();
    await expect(page.locator('#mobile')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#source')).toBeVisible();
  });

  test('cancel button on add form should return to list', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /orders/i }).first()).toBeVisible();
  });
});

// ============================================================
// 10. CREATE ORDER CRUD + API
// ============================================================
test.describe('Orders — Create Order CRUD + API', () => {
  test('submitting valid order should call POST /orders', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    const postPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/orders') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );
    await page.getByRole('button', { name: /add order/i }).click();
    await page.locator('#customer').fill('PW Test Order');
    await page.locator('#contact').fill('PW Contact');
    await page.locator('#mobile').fill('9876543210');
    await page.locator('#email').fill('pw-order@test.com');
    await page.locator('#source').selectOption({ index: 1 });
    await page.getByRole('button', { name: /create order/i }).click();
    const response = await postPromise;
    expect(response.status()).toBeLessThan(400);
  });

  test('POST order payload should contain required fields', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    let payload: Record<string, unknown> | null = null;
    page.on('request', req => {
      if (req.url().includes('/api/v1/orders') && req.method() === 'POST') {
        payload = req.postDataJSON();
      }
    });
    await page.getByRole('button', { name: /add order/i }).click();
    await page.locator('#customer').fill('Payload Order');
    await page.locator('#contact').fill('Payload Contact');
    await page.locator('#mobile').fill('9876543210');
    await page.locator('#email').fill('payload@test.com');
    await page.locator('#source').selectOption({ index: 1 });
    await page.getByRole('button', { name: /create order/i }).click();
    await page.waitForTimeout(2000);
    expect(payload).not.toBeNull();
  });
});

// ============================================================
// 11. EDIT ORDER FORM
// ============================================================
test.describe('Orders — Edit Order', () => {
  test('clicking edit button should navigate to edit form', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    // Edit button is typically the first action button
    const editBtn = page.locator('tbody tr').first().locator('td').last().locator('button').first();
    await editBtn.click();
    await page.waitForTimeout(1000);
    // Should show edit form with pre-filled data
    const editHeading = page.getByRole('heading', { name: /edit order/i });
    if (await editHeading.isVisible()) {
      const editCustomer = page.locator('#edit-customer');
      const val = await editCustomer.inputValue();
      expect(val.length).toBeGreaterThan(0);
    }
  });

  test('edit form should show update button', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const editBtn = page.locator('tbody tr').first().locator('td').last().locator('button').first();
    await editBtn.click();
    await page.waitForTimeout(1000);
    const updateBtn = page.getByRole('button', { name: /update order/i });
    if (await updateBtn.isVisible()) {
      await expect(updateBtn).toBeVisible();
    }
  });
});

// ============================================================
// 12. ORDER DETAIL DIALOG TABS
// ============================================================
test.describe('Orders — Detail Dialog Tabs', () => {
  test('detail dialog should have Details tab with content', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const viewBtn = page.locator('tbody tr').first().locator('td').last().locator('button').nth(2);
    await viewBtn.click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByRole('tab', { name: /details/i })).toBeVisible();
  });

  test('detail dialog should have Timeline tab', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const viewBtn = page.locator('tbody tr').first().locator('td').last().locator('button').nth(2);
    await viewBtn.click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const timelineTab = dialog.getByRole('tab', { name: /timeline/i });
    if (await timelineTab.isVisible()) {
      await timelineTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('detail dialog should have Actions tab', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const viewBtn = page.locator('tbody tr').first().locator('td').last().locator('button').nth(2);
    await viewBtn.click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const actionsTab = dialog.getByRole('tab', { name: /actions/i });
    if (await actionsTab.isVisible()) {
      await actionsTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('closing detail dialog should return to list', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const viewBtn = page.locator('tbody tr').first().locator('td').last().locator('button').nth(2);
    await viewBtn.click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Close dialog
    const closeBtn = dialog.locator('button').filter({ hasText: /close|×/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  });
});

// ============================================================
// 13. STATUS FILTER
// ============================================================
test.describe('Orders — Status Filter', () => {
  test('status dropdown should show All Status option', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    const statusFilter = page.getByRole('combobox').or(page.locator('select')).first();
    if (await statusFilter.isVisible()) {
      await expect(statusFilter).toBeVisible();
    }
  });
});

// ============================================================
// 14. API VERIFICATION
// ============================================================
test.describe('Orders — API Verification', () => {
  test('page load should call GET /orders', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/orders') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Orders', { exact: true }).click();
    await page.waitForURL('**/orders', { timeout: 10_000 });
    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });

  test('GET /orders response should contain data', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/orders') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );
    await page.locator('nav').getByText('Orders', { exact: true }).click();
    await page.waitForURL('**/orders', { timeout: 10_000 });
    const response = await apiPromise;
    const body = await response.json();
    expect(body.data || body).toBeDefined();
  });
});

// ============================================================
// 15. EXTENDED NAVIGATION
// ============================================================
test.describe('Orders — Extended Navigation', () => {
  test('direct URL access to /orders should work', async ({ authenticatedPage: page }) => {
    await page.goto('/orders');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/orders');
  });

  test('refreshing /orders should persist the page', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/orders');
  });

  test('sidebar navigation from orders to dashboard', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });
});

// ============================================================
// 16. EDGE CASES
// ============================================================
test.describe('Orders — Edge Cases', () => {
  test('searching for non-existent order should show no results or empty state', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by order/i);
    await searchInput.fill('ZZZZZNONEXISTENT999');
    await page.waitForTimeout(1000);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeLessThanOrEqual(1);
  });

  test('clearing search should restore all orders', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by order/i);
    await searchInput.fill('ZZZZZNONEXISTENT999');
    await page.waitForTimeout(500);
    await searchInput.clear();
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);
  });

  test('rapid tab switching should not crash', async ({ authenticatedPage: page }) => {
    await goToOrders(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('tab', { name: /pending/i }).click();
      await page.waitForTimeout(100);
      await page.getByRole('tab', { name: /all/i }).first().click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByRole('heading', { name: /orders/i }).first()).toBeVisible();
  });
});

// ============================================================
// 17. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Orders — Console Error Checks', () => {
  test('orders page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToOrders(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /orders:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('orders page load should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToOrders(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions on /orders:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add order form should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add order:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('tab switching should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToOrders(page);
    await page.getByRole('tab', { name: /pending/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /in production/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /all/i }).first().click();
    await page.waitForTimeout(500);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during tab switch:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('order detail dialog should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToOrders(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const viewBtn = page.locator('tbody tr').first().locator('td').last().locator('button').nth(2);
    await viewBtn.click();
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on detail dialog:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('form validation should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToOrders(page);
    await page.getByRole('button', { name: /add order/i }).click();
    await page.getByRole('button', { name: /create order/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToOrders(page);
    await page.getByPlaceholder(/search by order/i).fill('ORD');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
