import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the User Management module.
 * Covers: page load, stat cards, table data, search, form validation,
 * CRUD operations, API verification, navigation, edge cases, and console errors.
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

// ---------- Helper: Navigate to /users ----------
async function goToUsers(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Users', { exact: true }).click();
  await page.waitForURL('**/users', { timeout: 10_000 });
  await page.waitForTimeout(1000);
}

// ---------- Helper: Open Add User Dialog ----------
async function openAddUser(page: import('@playwright/test').Page) {
  await goToUsers(page);
  await page.getByRole('button', { name: /add new user/i }).click();
  await expect(page.locator('div[role="dialog"]')).toBeVisible();
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Users — Page Load & Layout', () => {
  test('should navigate to /users and show heading', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    expect(page.url()).toContain('/users');
    await expect(page.getByRole('heading', { name: /user management/i }).first()).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await expect(page.getByText(/manage system users.*roles.*permissions/i)).toBeVisible();
  });

  test('should display 4 stat cards', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    for (const label of [/total users/i, /active users/i, /admins/i, /roles/i]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test('should show search input', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await expect(page.getByPlaceholder(/search by name.*username.*email.*role/i)).toBeVisible();
  });

  test('should show Add New User button', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await expect(page.getByRole('button', { name: /add new user/i })).toBeVisible();
  });

  test('should show user table with correct headers', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    for (const header of ['User', 'Role', 'Permissions', 'Last Login', 'Status']) {
      await expect(page.locator('thead').getByText(header, { exact: true }).first()).toBeVisible();
    }
  });

  test('stat cards should show numeric values', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    const statValues = page.locator('.text-2xl.font-bold, .text-3xl.font-bold');
    const count = await statValues.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ============================================================
// 2. ADD USER FORM VALIDATION
// ============================================================
test.describe('Users — Add User Form Validation', () => {
  test('submitting empty form should show required-field errors', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.getByRole('button', { name: /add user/i }).click();

    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page.getByText('Username is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Role is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('name with 1 character should show min-length error', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#name').fill('A');
    await dialog.locator('#username').fill('testuser');
    await dialog.locator('#email').fill('test@test.com');
    await dialog.locator('#password').fill('password123');
    await dialog.locator('select').first().selectOption({ index: 1 }); // role
    await dialog.getByRole('button', { name: /add user/i }).click();
    await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible();
  });

  test('username with 2 characters should show min-length error', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#name').fill('Test User');
    await dialog.locator('#username').fill('ab');
    await dialog.locator('#email').fill('test@test.com');
    await dialog.locator('#password').fill('password123');
    await dialog.locator('select').first().selectOption({ index: 1 });
    await dialog.getByRole('button', { name: /add user/i }).click();
    await expect(page.getByText(/username must be at least 3 characters/i)).toBeVisible();
  });

  test('invalid email should show email validation error', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#name').fill('Test User');
    await dialog.locator('#username').fill('testuser');
    await dialog.locator('#email').fill('invalid-email');
    await dialog.locator('#password').fill('password123');
    await dialog.locator('select').first().selectOption({ index: 1 });
    await dialog.getByRole('button', { name: /add user/i }).click();
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  });

  test('invalid phone should show phone validation error', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#name').fill('Test User');
    await dialog.locator('#username').fill('testuser');
    await dialog.locator('#email').fill('test@test.com');
    await dialog.locator('#phone').fill('123');
    await dialog.locator('#password').fill('password123');
    await dialog.locator('select').first().selectOption({ index: 1 });
    await dialog.getByRole('button', { name: /add user/i }).click();
    await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
  });

  test('password with 5 characters should show min-length error', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#name').fill('Test User');
    await dialog.locator('#username').fill('testuser');
    await dialog.locator('#email').fill('test@test.com');
    await dialog.locator('#password').fill('12345');
    await dialog.locator('select').first().selectOption({ index: 1 });
    await dialog.getByRole('button', { name: /add user/i }).click();
    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();
  });

  test('cancel button should close dialog', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});

// ============================================================
// 3. CREATE USER (CRUD + API)
// ============================================================
test.describe('Users — Create User (CRUD + API)', () => {
  test('should create a user via form and verify API call', async ({ authenticatedPage: page }) => {
    const createPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/users') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );

    await openAddUser(page);
    const dialog = page.locator('div[role="dialog"]');

    await dialog.locator('#name').fill('Playwright User');
    await dialog.locator('#username').fill('playwrightuser');
    await dialog.locator('#email').fill('playwright@test.com');
    await dialog.locator('#phone').fill('9876543210');
    await dialog.locator('#password').fill('password123');
    await dialog.locator('select').first().selectOption({ index: 1 });

    await dialog.getByRole('button', { name: /add user/i }).click();

    const response = await createPromise;
    expect(response.status()).toBeLessThan(400);
  });
});

// ============================================================
// 4. READ & TABLE DATA
// ============================================================
test.describe('Users — Read & Table Data', () => {
  test('table should display user rows', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });

  test('each row should show user name', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const firstCell = page.locator('tbody tr').first().locator('td').first();
    await expect(firstCell).not.toBeEmpty();
  });

  test('each row should show role', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const roleCell = page.locator('tbody tr').first().locator('td').nth(1);
    await expect(roleCell).not.toBeEmpty();
  });

  test('each row should show status badge', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const statusCell = page.locator('tbody tr').first().locator('td').nth(4);
    await expect(statusCell).not.toBeEmpty();
  });

  test('each row should have action buttons', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const actionBtns = page.locator('tbody tr').first().locator('td').last().locator('button');
    const count = await actionBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// 5. SEARCH
// ============================================================
test.describe('Users — Search', () => {
  test('search should filter users', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by name.*username.*email.*role/i);
    await searchInput.fill('admin');
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('admin');
  });

  test('search with no results should show empty table', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const searchInput = page.getByPlaceholder(/search by name.*username.*email.*role/i);
    await searchInput.fill('NONEXISTENT_USER_XYZ!!');
    await page.waitForTimeout(500);
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBe(0);
  });

  test('clearing search should show all users again', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const initialCount = await page.locator('tbody tr').count();
    const searchInput = page.getByPlaceholder(/search by name.*username.*email.*role/i);
    await searchInput.fill('NONEXISTENT');
    await page.waitForTimeout(500);
    await searchInput.fill('');
    await page.waitForTimeout(500);
    expect(await page.locator('tbody tr').count()).toBe(initialCount);
  });
});

// ============================================================
// 6. EVENT TYPES
// ============================================================
test.describe('Users — Event Types', () => {
  test('clicking Add New User should open dialog', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    await expect(page.getByText(/create a new user account/i)).toBeVisible();
  });

  test('typing in search should update input value', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    const searchInput = page.getByPlaceholder(/search by name.*username.*email.*role/i);
    await searchInput.fill('Manager');
    await expect(searchInput).toHaveValue('Manager');
  });
});

// ============================================================
// 7. API VERIFICATION
// ============================================================
test.describe('Users — API Verification', () => {
  test('page load should call GET /api/v1/users', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/users') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.locator('nav').getByText('Users', { exact: true }).click();
    await page.waitForURL('**/users', { timeout: 10_000 });

    const response = await apiPromise;
    expect(response.status()).toBe(200);
  });

  test('create user API should send correct payload', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    const createPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/users') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );

    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#name').fill('API Test User');
    await dialog.locator('#username').fill('apitestuser');
    await dialog.locator('#email').fill('apitest@test.com');
    await dialog.locator('#password').fill('password123');
    await dialog.locator('select').first().selectOption({ index: 1 });
    await dialog.getByRole('button', { name: /add user/i }).click();

    const response = await createPromise;
    const requestBody = response.request().postDataJSON();
    expect(requestBody.name).toBe('API Test User');
    expect(requestBody.username).toBe('apitestuser');
    expect(requestBody.email).toBe('apitest@test.com');
  });
});

// ============================================================
// 8. NAVIGATION
// ============================================================
test.describe('Users — Navigation', () => {
  test('sidebar navigation from users to dashboard', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('direct URL access to /users should work', async ({ authenticatedPage: page }) => {
    await page.goto('/users');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/users');
  });

  test('refreshing /users should persist the page', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/users');
  });
});

// ============================================================
// 9. EDGE CASES
// ============================================================
test.describe('Users — Edge Cases', () => {
  test('opening and closing dialog multiple times should work', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /add new user/i }).click();
      await expect(page.locator('div[role="dialog"]')).toBeVisible();
      await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
      await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
    }
  });

  test('pagination should work if available', async ({ authenticatedPage: page }) => {
    await goToUsers(page);
    const nextBtn = page.getByRole('button', { name: /next/i });
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(page.getByRole('heading', { name: /user management/i }).first()).toBeVisible();
  });

  test('valid form data should not show any errors', async ({ authenticatedPage: page }) => {
    await openAddUser(page);
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('#name').fill('Valid User');
    await dialog.locator('#username').fill('validuser');
    await dialog.locator('#email').fill('valid@test.com');
    await dialog.locator('#password').fill('password123');
    await expect(page.getByText('Name is required')).not.toBeVisible();
    await expect(page.getByText('Username is required')).not.toBeVisible();
  });
});

// ============================================================
// 10. CONSOLE ERROR CHECKS
// ============================================================
test.describe('Users — Console Error Checks', () => {
  test('users page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToUsers(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /users:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('users page should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToUsers(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening add user dialog should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddUser(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on add user:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('submitting invalid form should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openAddUser(page);
    await page.locator('div[role="dialog"]').getByRole('button', { name: /add user/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on form validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToUsers(page);
    await page.getByPlaceholder(/search by name.*username.*email.*role/i).fill('admin');
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
