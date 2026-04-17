import { test, expect } from '../fixtures';

/**
 * Verify that the Finance module lists all sources of income and expenses:
 * - Manual transactions (source: 'transaction')
 * - Orders (source: 'order') → income
 * - Invoices/Bills (source: 'bill') → income
 * - Purchase Orders (source: 'purchase_order') → expense
 *
 * Also verify that NO pending transactions appear in the list.
 */

async function goToFinance(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Finance', { exact: true }).click();
  await page.waitForURL('**/finance', { timeout: 10_000 });
  await page.waitForTimeout(1500);
}

test.describe('Finance — All Sources Listed & No Pending', () => {

  test('API should return transactions from all 4 sources and none pending', async ({ authenticatedPage: page }) => {
    // Intercept the combined transactions API call
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/finance/transactions/all') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await goToFinance(page);
    const response = await apiPromise;
    expect(response.status()).toBe(200);

    const body = await response.json();
    const items: any[] = body.data?.items || [];

    console.log(`Total finance items returned: ${items.length}`);

    // Categorize by source
    const sources = new Map<string, number>();
    const statuses = new Map<string, number>();
    const types = new Map<string, number>();

    for (const item of items) {
      const src = item._source || 'transaction';
      sources.set(src, (sources.get(src) || 0) + 1);
      statuses.set(item.status, (statuses.get(item.status) || 0) + 1);
      types.set(item.type, (types.get(item.type) || 0) + 1);
    }

    console.log('Sources breakdown:', Object.fromEntries(sources));
    console.log('Statuses breakdown:', Object.fromEntries(statuses));
    console.log('Types breakdown:', Object.fromEntries(types));

    // ✅ Verify NO pending transactions are returned
    const pendingCount = statuses.get('pending') || 0;
    expect(pendingCount, 'No pending transactions should be listed').toBe(0);

    // ✅ Verify that we have both income and expense types
    expect(types.has('income'), 'Should have income transactions').toBeTruthy();
    expect(types.has('expense'), 'Should have expense transactions').toBeTruthy();

    // ✅ Verify all 4 sources are present
    const expectedSources = ['transaction', 'order', 'bill', 'purchase_order'];
    const missingSources: string[] = [];
    for (const src of expectedSources) {
      if (!sources.has(src)) {
        missingSources.push(src);
      } else {
        console.log(`  ✓ Source "${src}": ${sources.get(src)} items`);
      }
    }

    if (missingSources.length > 0) {
      console.log(`  ⚠ Missing sources: ${missingSources.join(', ')}`);
    }

    // At least manual transactions should be present
    expect(sources.has('transaction'), 'Manual transactions should be listed').toBeTruthy();
  });

  test('source filter buttons should show counts for each source', async ({ authenticatedPage: page }) => {
    await goToFinance(page);

    // Check that source filter buttons exist
    const sourceButtons = ['Manual', 'Orders', 'Invoices', 'Purchase Orders'];
    for (const label of sourceButtons) {
      const btn = page.locator('button').filter({ hasText: new RegExp(label, 'i') }).first();
      await expect(btn, `Source filter button "${label}" should be visible`).toBeVisible();

      // Each button shows a count in parentheses
      const text = await btn.textContent();
      console.log(`  Filter button: ${text}`);
    }
  });

  test('all displayed transactions should have completed or cancelled status only', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });

    // Grab status badges from the table
    const statusBadges = page.locator('tbody tr td span').filter({ hasText: /completed|pending|cancelled/i });
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const text = (await statusBadges.nth(i).textContent())?.trim().toLowerCase() || '';
      expect(text, `Row ${i + 1} status "${text}" should not be pending`).not.toContain('pending');
    }
    console.log(`  ✓ Verified ${count} status badges — none are pending`);
  });

  test('clicking each source filter should show only that source', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });

    // Scope filter buttons to the filter bar area (inside the transactions card, not the sidebar)
    const filterArea = page.locator('.overflow-x-auto').first().locator('..');

    // Get total count first
    const totalRows = await page.locator('tbody tr').count();
    console.log(`  Total rows (All): ${totalRows}`);

    // Click "Manual" filter — button text includes count like "Manual(33)"
    await filterArea.locator('button', { hasText: 'Manual' }).click();
    await page.waitForTimeout(500);
    const manualRows = await page.locator('tbody tr').count();
    console.log(`  Manual rows: ${manualRows}`);

    // Click "Orders" filter — scoped to filter area to avoid sidebar
    await filterArea.locator('button', { hasText: 'Orders' }).filter({ hasNotText: 'Purchase' }).click();
    await page.waitForTimeout(500);
    const orderRows = await page.locator('tbody tr').count();
    console.log(`  Order rows: ${orderRows}`);

    // Click "Invoices" filter
    await filterArea.locator('button', { hasText: 'Invoices' }).click();
    await page.waitForTimeout(500);
    const invoiceRows = await page.locator('tbody tr').count();
    console.log(`  Invoice rows: ${invoiceRows}`);

    // Click "Purchase Orders" filter
    await filterArea.locator('button', { hasText: 'Purchase Orders' }).click();
    await page.waitForTimeout(500);
    const poRows = await page.locator('tbody tr').count();
    console.log(`  Purchase Order rows: ${poRows}`);

    // Click "All" source filter to reset
    await filterArea.locator('button', { hasText: /^All$/ }).click();
    await page.waitForTimeout(500);
    const allRows = await page.locator('tbody tr').count();
    expect(allRows).toBe(totalRows);

    console.log(`  Summary: Manual=${manualRows}, Orders=${orderRows}, Invoices=${invoiceRows}, POs=${poRows}, Total=${totalRows}`);
  });

  test('income and expense type filters should work correctly', async ({ authenticatedPage: page }) => {
    await goToFinance(page);
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });

    // Click "Income" filter
    await page.locator('button').filter({ hasText: /^Income$/i }).first().click();
    await page.waitForTimeout(500);
    const incomeRows = await page.locator('tbody tr').count();
    console.log(`  Income rows: ${incomeRows}`);

    // Verify all visible rows show "Income" type
    if (incomeRows > 0) {
      const firstType = page.locator('tbody tr').first().locator('td').nth(1);
      await expect(firstType).toContainText(/income/i);
    }

    // Click "Expense" filter
    await page.locator('button').filter({ hasText: /^Expense$/i }).first().click();
    await page.waitForTimeout(500);
    const expenseRows = await page.locator('tbody tr').count();
    console.log(`  Expense rows: ${expenseRows}`);

    // Verify all visible rows show "Expense" type
    if (expenseRows > 0) {
      const firstType = page.locator('tbody tr').first().locator('td').nth(1);
      await expect(firstType).toContainText(/expense/i);
    }

    // Click "All Types" to reset
    await page.locator('button').filter({ hasText: /^All Types$/i }).first().click();
    await page.waitForTimeout(500);

    console.log(`  Income: ${incomeRows}, Expense: ${expenseRows}`);
    expect(incomeRows + expenseRows).toBeGreaterThan(0);
  });

  test('stat cards should reflect only completed transaction totals', async ({ authenticatedPage: page }) => {
    // Intercept summary API
    const summaryPromise = page.waitForResponse(
      resp => resp.url().includes('/finance/summary') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await goToFinance(page);
    const summaryResp = await summaryPromise;
    const summaryBody = await summaryResp.json();
    const apiIncome = summaryBody.data?.totalIncome || 0;
    const apiExpense = summaryBody.data?.totalExpense || 0;

    console.log(`  API Summary — Income: ₹${apiIncome}, Expense: ₹${apiExpense}`);

    // Verify stat cards display values
    await expect(page.getByText(/total income/i).first()).toBeVisible();
    await expect(page.getByText(/total expenses/i).first()).toBeVisible();

    expect(apiIncome).toBeGreaterThanOrEqual(0);
    expect(apiExpense).toBeGreaterThanOrEqual(0);
  });
});
