import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

test.describe('Dashboard Page', () => {
  // ── Auto-report browser console errors after every test ──
  let _consoleErrors: ConsoleError[] = [];
  test.beforeEach(async ({ consoleErrors }) => {
    _consoleErrors = consoleErrors;
  });
  test.afterEach(async ({}, testInfo) => {
    if (_consoleErrors.length > 0) {
      const summary = _consoleErrors.map(
        (e, i) => `  [${i + 1}] (${e.source}) ${e.message}  — at ${e.url ?? 'unknown'}`
      ).join('\n');
      // Attach to the HTML report for visibility
      await testInfo.attach('browser-console-errors', {
        body: summary,
        contentType: 'text/plain',
      });
    }
  });

  test.describe('Page Load & Layout', () => {
    test('should land on /dashboard URL after login', async ({ authenticatedPage: page }) => {
      expect(page.url()).toContain('/dashboard');
    });

    test('should display the dashboard title in the header', async ({ authenticatedPage: page }) => {
      await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();
    });

    test('should show the sidebar with MES Pro branding', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('MES Pro')).toBeVisible();
      await expect(page.locator('aside').getByRole('paragraph').filter({ hasText: /^Production$/ })).toBeVisible();
    });

    test('should show the top bar with search, notifications, and user info', async ({ authenticatedPage: page }) => {
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();
      await expect(page.locator('header button').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible();
    });
  });

  test.describe('Statistics Cards', () => {
    test('should display 4 stat cards', async ({ authenticatedPage: page }) => {
      const statCards = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4 > div');
      await expect(statCards).toHaveCount(4);
    });

    test('should show "New Leads" stat card with a value', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('New Leads')).toBeVisible();
    });

    test('should show "In Production" stat card with a value', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('In Production', { exact: true }).first()).toBeVisible();
    });

    test('should show "Stock Alerts" stat card with a value', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('Stock Alerts')).toBeVisible();
    });

    test('should show "Dispatches" stat card with a value', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('Dispatches')).toBeVisible();
    });

    test('should show trend indicators on stat cards', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('+12%').first()).toBeVisible();
    });
  });

  test.describe('Orders In Production Section', () => {
    test('should display "Orders in Production" section', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('Orders in Production')).toBeVisible();
    });

    test('should show "View All" button for orders', async ({ authenticatedPage: page }) => {
      const viewAllBtn = page.getByRole('button', { name: /view all/i }).first();
      await expect(viewAllBtn).toBeVisible();
    });

    test('should display order cards with order numbers', async ({ authenticatedPage: page }) => {
      await expect(page.getByText(/ORD-/).first()).toBeVisible();
    });

    test('should show progress bars for orders', async ({ authenticatedPage: page }) => {
      const progressBars = page.locator('.bg-blue-600.h-2.rounded-full');
      const count = await progressBars.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should show priority badges on orders', async ({ authenticatedPage: page }) => {
      const priorityBadges = page.locator('[class*="priority"]').or(
        page.getByText(/high|medium|low/i).first()
      );
      await expect(priorityBadges.first()).toBeVisible();
    });
  });

  test.describe('Inventory Alerts Section', () => {
    test('should display "Inventory Alerts" section', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('Inventory Alerts')).toBeVisible();
    });

    test('should show "Manage" button for inventory', async ({ authenticatedPage: page }) => {
      await expect(page.getByRole('button', { name: /manage/i })).toBeVisible();
    });

    test('should list low stock items', async ({ authenticatedPage: page }) => {
      await expect(page.getByText(/MDF Sheet|Mica Sheet|Aluminium Edge/i).first()).toBeVisible();
    });

    test('should show current stock levels', async ({ authenticatedPage: page }) => {
      await expect(page.getByText(/units/i).first()).toBeVisible();
    });
  });

  test.describe('Pending Leads Section', () => {
    test('should display "Pending Leads" section', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('Pending Leads')).toBeVisible();
    });

    test('should show "View All Leads" button', async ({ authenticatedPage: page }) => {
      await expect(page.getByRole('button', { name: /view all leads/i })).toBeVisible();
    });

    test('should display lead cards with IDs', async ({ authenticatedPage: page }) => {
      await expect(page.getByText(/LEAD-/i).first()).toBeVisible();
    });

    test('should show lead source badges', async ({ authenticatedPage: page }) => {
      await expect(page.getByText(/Website|Phone|Referral/i).first()).toBeVisible();
    });

    test('should show lead status', async ({ authenticatedPage: page }) => {
      await expect(page.getByText(/New|Contacted|Qualified/i).first()).toBeVisible();
    });
  });

  test.describe('Quick Stats Section', () => {
    test('should display "Completed this Week" stat', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('Completed this Week')).toBeVisible();
    });

    test('should display "Avg Production Time" stat', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('Avg. Production Time')).toBeVisible();
    });

    test('should display "Production Efficiency" stat', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('Production Efficiency')).toBeVisible();
    });

    test('should show efficiency percentage', async ({ authenticatedPage: page }) => {
      await expect(page.getByText('94.2%')).toBeVisible();
    });
  });

  test.describe('Sidebar Navigation from Dashboard', () => {
    test('should show Dashboard as the active nav item', async ({ authenticatedPage: page }) => {
      const dashboardNav = page.locator('nav button').filter({ hasText: /dashboard/i });
      await expect(dashboardNav).toBeVisible();
      await expect(dashboardNav).toHaveClass(/bg-gray-500/);
    });

    test('should list all major navigation items', async ({ authenticatedPage: page }) => {
      const navItems = ['Dashboard', 'Leads', 'Orders', 'Production', 'Inventory', 'Dispatch', 'Reports'];
      for (const item of navItems) {
        await expect(page.locator('nav').getByText(item, { exact: true })).toBeVisible();
      }
    });
  });

  test.describe('Stat Card Navigation (URL routing)', () => {
    test('clicking "New Leads" card should navigate to /leads', async ({ authenticatedPage: page }) => {
      await page.getByText('New Leads').click();
      await page.waitForURL('**/leads', { timeout: 5000 });
      expect(page.url()).toContain('/leads');
      await expect(page.getByRole('heading', { name: /leads/i }).first()).toBeVisible();
    });

    test('clicking "In Production" card should navigate to /production', async ({ authenticatedPage: page }) => {
      await page.getByText('In Production', { exact: true }).first().click();
      await page.waitForURL('**/production', { timeout: 5000 });
      expect(page.url()).toContain('/production');
    });

    test('clicking "Dispatches" card should navigate to /dispatch', async ({ authenticatedPage: page }) => {
      await page.getByText('Dispatches').click();
      await page.waitForURL('**/dispatch', { timeout: 5000 });
      expect(page.url()).toContain('/dispatch');
    });
  });

  test.describe('Language Toggle', () => {
    test('should switch to Tamil when "தமிழ்" is clicked', async ({ authenticatedPage: page }) => {
      await page.getByRole('button', { name: 'தமிழ்' }).click();
      await page.waitForTimeout(500);
      const taButton = page.getByRole('button', { name: 'தமிழ்' });
      await expect(taButton).toHaveClass(/bg-white/);
    });

    test('should switch back to English when "EN" is clicked', async ({ authenticatedPage: page }) => {
      await page.getByRole('button', { name: 'தமிழ்' }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'EN' }).click();
      await page.waitForTimeout(300);

      const enButton = page.getByRole('button', { name: 'EN', exact: true });
      await expect(enButton).toHaveClass(/bg-white/);
      await expect(page.getByText('Dashboard').first()).toBeVisible();
    });
  });

  test.describe('"View All" Actions (URL routing)', () => {
    test('clicking "View All" on orders section should navigate to /production', async ({ authenticatedPage: page }) => {
      const viewAllBtn = page.getByRole('button', { name: /view all$/i }).first();
      await viewAllBtn.click();
      await page.waitForURL('**/production', { timeout: 5000 });
      expect(page.url()).toContain('/production');
    });

    test('clicking "Manage" on inventory alerts should navigate to /inventory', async ({ authenticatedPage: page }) => {
      await page.getByRole('button', { name: /manage/i }).click();
      await page.waitForURL('**/inventory', { timeout: 5000 });
      expect(page.url()).toContain('/inventory');
    });

    test('clicking "View All Leads" should navigate to /leads', async ({ authenticatedPage: page }) => {
      await page.getByRole('button', { name: /view all leads/i }).click();
      await page.waitForURL('**/leads', { timeout: 5000 });
      expect(page.url()).toContain('/leads');
    });
  });

  test.describe('Sidebar Navigation (URL routing)', () => {
    test('clicking Leads in sidebar should update URL to /leads', async ({ authenticatedPage: page }) => {
      await page.locator('nav').getByText('Leads', { exact: true }).click();
      await page.waitForURL('**/leads', { timeout: 5000 });
      expect(page.url()).toContain('/leads');
    });

    test('clicking Orders in sidebar should update URL to /orders', async ({ authenticatedPage: page }) => {
      await page.locator('nav').getByText('Orders', { exact: true }).click();
      await page.waitForURL('**/orders', { timeout: 5000 });
      expect(page.url()).toContain('/orders');
    });

    test('clicking Production in sidebar should update URL to /production', async ({ authenticatedPage: page }) => {
      await page.locator('nav button').filter({ hasText: /^Production$/ }).click();
      await page.waitForURL('**/production', { timeout: 5000 });
      expect(page.url()).toContain('/production');
    });

    test('navigating away and clicking Dashboard returns to /dashboard', async ({ authenticatedPage: page }) => {
      await page.locator('nav').getByText('Leads', { exact: true }).click();
      await page.waitForURL('**/leads', { timeout: 5000 });
      await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 5000 });
      expect(page.url()).toContain('/dashboard');
    });
  });

  test.describe('Page Refresh Persistence', () => {
    test('refreshing on /dashboard should stay on dashboard', async ({ authenticatedPage: page }) => {
      await page.reload();
      await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
      expect(page.url()).toContain('/dashboard');
      await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();
    });

    test('navigating to /leads and refreshing should stay on leads', async ({ authenticatedPage: page }) => {
      await page.locator('nav').getByText('Leads', { exact: true }).click();
      await page.waitForURL('**/leads', { timeout: 5000 });
      await page.reload();
      await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
      expect(page.url()).toContain('/leads');
    });
  });

  test.describe('Auth Guard', () => {
    test('accessing /dashboard without login should redirect to /login', async ({ browser }) => {
      // Use a fresh context with NO storage state to simulate unauthenticated user
      const context = await browser.newContext({ storageState: undefined });
      const page = await context.newPage();
      await page.goto('/dashboard');
      await page.waitForURL('**/login', { timeout: 15_000 });
      expect(page.url()).toContain('/login');
      await context.close();
    });

    test('accessing /leads without login should redirect to /login', async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined });
      const page = await context.newPage();
      await page.goto('/leads');
      await page.waitForURL('**/login', { timeout: 15_000 });
      expect(page.url()).toContain('/login');
      await context.close();
    });
  });

  test.describe('Logout', () => {
    test('clicking logout should return to /login', async ({ authenticatedPage: page }) => {
      await page.getByText('Logout').click();
      await page.waitForURL('**/login', { timeout: 5000 });
      expect(page.url()).toContain('/login');
      await expect(page.getByText('Sign in to MES System')).toBeVisible();
    });
  });

  // ============================================================
  // Browser Console Error Checks
  // ============================================================
  test.describe('Console Errors', () => {
    test('dashboard page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
      // Dashboard already loaded via fixture; wait a moment for async rendering
      await page.waitForTimeout(2000);
      const errors = consoleErrors.filter(e => e.source === 'console');
      expect(errors, `Unexpected console errors:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
    });

    test('dashboard page load should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
      await page.waitForTimeout(2000);
      const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
      expect(pageErrors, `Uncaught page errors:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
    });

    test('navigating to leads and back should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
      await page.locator('nav').getByText('Leads', { exact: true }).click();
      await page.waitForURL('**/leads', { timeout: 5000 });
      await page.waitForTimeout(1000);

      await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 5000 });
      await page.waitForTimeout(1000);

      const errors = consoleErrors.filter(e => e.source === 'console');
      expect(errors, `Console errors during navigation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
    });

    test('navigating through multiple pages should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
      const pages = ['Leads', 'Orders', 'Production', 'Inventory'];
      for (const nav of pages) {
        await page.locator('nav').getByText(nav, { exact: true }).click();
        await page.waitForTimeout(1000);
      }
      const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
      expect(pageErrors, `Uncaught exceptions during navigation:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
    });

    test('language toggle should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
      await page.getByRole('button', { name: 'தமிழ்' }).click();
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: 'EN' }).click();
      await page.waitForTimeout(1000);

      const errors = consoleErrors.filter(e => e.source === 'console');
      expect(errors, `Console errors during language toggle:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
    });
  });
});
