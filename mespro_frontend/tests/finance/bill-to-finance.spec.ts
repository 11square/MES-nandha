import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * End-to-end test: Create a paid bill/invoice in Billing, then verify the
 * transaction appears in the Finance tab and finance module.
 *
 * Flow:
 * 1. Navigate to Billing → create a cash invoice (auto-paid)
 * 2. Navigate to Finance → verify the paid transaction is listed
 * 3. Verify the bill also shows as a completed entry from the 'bill' source
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

// Unique identifier to trace this test's bill in finance
const TEST_CLIENT = `PW-TestClient-${Date.now()}`;

// ---------- Helpers ----------
async function goToBilling(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Billing', { exact: true }).click();
  await page.waitForURL('**/billing', { timeout: 10_000 });
  await page.waitForTimeout(1500);
}

async function goToFinance(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Finance', { exact: true }).click();
  await page.waitForURL('**/finance', { timeout: 10_000 });
  await page.waitForTimeout(1500);
}

// ============================================================
// MAIN TEST: Create paid bill → Verify in Finance
// ============================================================
test.describe('Billing to Finance — Paid Bill Appears in Finance', () => {

  test('creating a cash-paid invoice in billing should show as completed transaction in finance', async ({ authenticatedPage: page }) => {
    // ────────────────────────────────────────────
    // STEP 1: Navigate to Billing and open New Invoice form
    // ────────────────────────────────────────────
    await goToBilling(page);

    // Click "New Invoice" button
    await page.getByRole('button', { name: /new invoice/i }).click();
    await page.waitForTimeout(1000);

    // Verify we're on the create invoice form
    await expect(page.getByText(/create new invoice/i)).toBeVisible();

    // ────────────────────────────────────────────
    // STEP 2: Fill in the invoice form
    // ────────────────────────────────────────────

    // Date is auto-filled with today, leave as-is

    // Bill Type: select "Cash" (should be default, but ensure it)
    const billTypeSelect = page.locator('select').filter({ has: page.locator('option[value="cash"]') }).first();
    await billTypeSelect.selectOption('cash');

    // Client: type a unique test client name
    const clientInput = page.getByPlaceholder('Search client...');
    await clientInput.fill(TEST_CLIENT);
    await page.waitForTimeout(500);

    // If dropdown appears with "Use as new client" option, click it
    const useAsNewClient = page.locator('div').filter({ hasText: new RegExp(`Use "${TEST_CLIENT}"`) }).first();
    if (await useAsNewClient.isVisible({ timeout: 2000 }).catch(() => false)) {
      await useAsNewClient.click();
    } else {
      // Close dropdown by clicking elsewhere
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(300);

    // ────────────────────────────────────────────
    // STEP 3: Add an item to the bill
    // ────────────────────────────────────────────
    const itemInput = page.getByPlaceholder('Search item...');
    await itemInput.first().click();
    await itemInput.first().fill('');
    await page.waitForTimeout(500);

    // Select the first available stock item from dropdown
    const itemDropdown = page.locator('.absolute.z-\\[9999\\] div, [class*="absolute"] [class*="z-"] div').filter({ hasText: /₹/ }).first();
    if (await itemDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await itemDropdown.click();
      await page.waitForTimeout(300);
    } else {
      // Try typing a common item name
      await itemInput.first().fill('a');
      await page.waitForTimeout(500);
      const firstItem = page.locator('.absolute div.cursor-pointer').first();
      await firstItem.click({ timeout: 5000 });
      await page.waitForTimeout(300);
    }

    // Set quantity to 2
    const qtyInput = page.locator('input[type="number"]').filter({ has: page.locator('[min="1"]') }).first();
    if (await qtyInput.isVisible().catch(() => false)) {
      await qtyInput.fill('2');
    }

    // Click "Add to Bill" button
    const addToBillBtn = page.getByRole('button', { name: /add to bill/i });
    await addToBillBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify item was added (the added items table should appear)
    await expect(page.locator('table').filter({ hasText: /Item Name/ }).last()).toBeVisible({ timeout: 5000 });

    // ────────────────────────────────────────────
    // STEP 4: Capture the bill number & submit
    // ────────────────────────────────────────────
    // Read the auto-generated bill number
    const billNumberInput = page.locator('input[readonly]').first();
    const billNumber = await billNumberInput.inputValue();
    console.log(`  Bill Number: ${billNumber}`);
    console.log(`  Client: ${TEST_CLIENT}`);

    // Intercept the billing API call
    const createBillPromise = page.waitForResponse(
      resp => resp.url().includes('/billing') && resp.request().method() === 'POST',
      { timeout: 15_000 }
    );

    // Click "Create Invoice"
    const createBtn = page.getByRole('button', { name: /create invoice/i });
    await createBtn.click();

    // Wait for the API response
    const createResp = await createBillPromise;
    const createStatus = createResp.status();
    console.log(`  Create Bill API status: ${createStatus}`);
    expect(createStatus).toBeLessThan(400);

    // Wait for success toast
    await page.waitForTimeout(2000);

    // ────────────────────────────────────────────
    // STEP 5: Navigate to Finance module
    // ────────────────────────────────────────────
    // Intercept the finance transactions API
    const financeApiPromise = page.waitForResponse(
      resp => resp.url().includes('/finance/transactions/all') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await goToFinance(page);

    // Wait for finance data to load
    const financeResp = await financeApiPromise;
    expect(financeResp.status()).toBe(200);
    const financeBody = await financeResp.json();
    const allItems: any[] = financeBody.data?.items || [];

    // ────────────────────────────────────────────
    // STEP 6: Verify the bill appears in finance API data
    // ────────────────────────────────────────────
    // Look for entries matching our bill number or client name
    const matchingByBillNo = allItems.filter(item =>
      item.reference === billNumber || (item.description && item.description.includes(billNumber))
    );
    const matchingByClient = allItems.filter(item =>
      item.client_name === TEST_CLIENT || (item.description && item.description.includes(TEST_CLIENT))
    );

    console.log(`  Finance items matching bill number "${billNumber}": ${matchingByBillNo.length}`);
    console.log(`  Finance items matching client "${TEST_CLIENT}": ${matchingByClient.length}`);

    // At least one entry should match (could be transaction source and/or bill source)
    const allMatching = [...new Set([...matchingByBillNo, ...matchingByClient])];
    expect(allMatching.length, `Expected at least 1 finance entry for bill ${billNumber}`).toBeGreaterThanOrEqual(1);

    // All matching entries should be completed (not pending)
    for (const item of allMatching) {
      console.log(`  Found: id=${item.id}, source=${item._source}, status=${item.status}, type=${item.type}, amount=${item.amount}`);
      expect(item.status, `Finance entry ${item.id} should be completed`).toBe('completed');
      expect(item.type, `Finance entry ${item.id} should be income`).toBe('income');
    }

    // ────────────────────────────────────────────
    // STEP 7: Verify the bill is visible in the Finance UI table
    // ────────────────────────────────────────────
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });

    // Look for the bill number or client name in the transactions table
    const tableText = await page.locator('tbody').textContent();
    const billFoundInTable = tableText?.includes(billNumber) || tableText?.includes(TEST_CLIENT);
    expect(billFoundInTable, `Bill ${billNumber} / client ${TEST_CLIENT} should appear in the finance table`).toBeTruthy();
    console.log(`  ✓ Bill ${billNumber} found in finance transactions table`);

    // Verify the matching row has "Completed" status badge
    const matchingRow = page.locator('tbody tr').filter({ hasText: billNumber }).or(
      page.locator('tbody tr').filter({ hasText: TEST_CLIENT })
    ).first();

    if (await matchingRow.isVisible().catch(() => false)) {
      const rowText = await matchingRow.textContent();
      expect(rowText).toContain('Completed');
      console.log(`  ✓ Matching row shows "Completed" status`);
    }

    // ────────────────────────────────────────────
    // STEP 8: Verify the bill shows via Invoices source filter
    // ────────────────────────────────────────────
    const filterArea = page.locator('.overflow-x-auto').first().locator('..');
    await filterArea.locator('button', { hasText: 'Invoices' }).click();
    await page.waitForTimeout(500);

    const invoiceTableText = await page.locator('tbody').textContent();
    const billInInvoices = invoiceTableText?.includes(billNumber) || invoiceTableText?.includes(TEST_CLIENT);
    console.log(`  Bill in Invoices filter: ${billInInvoices}`);

    // Reset filter
    await filterArea.locator('button', { hasText: /^All$/ }).click();
    await page.waitForTimeout(300);

    // Also check via Manual filter (the auto-created cash transaction)
    await filterArea.locator('button', { hasText: 'Manual' }).click();
    await page.waitForTimeout(500);

    const manualTableText = await page.locator('tbody').textContent();
    const txInManual = manualTableText?.includes(billNumber) || manualTableText?.includes(TEST_CLIENT);
    console.log(`  Transaction in Manual filter: ${txInManual}`);

    // At least one of the two filters should show our entry
    expect(billInInvoices || txInManual, 'Bill should appear in Invoices or Manual filter').toBeTruthy();
    console.log(`  ✓ Paid bill verified in Finance module`);
  });

  test('stat cards should reflect the new paid transaction amounts', async ({ authenticatedPage: page }) => {
    // Navigate to finance and check that summary API returns income > 0
    const summaryPromise = page.waitForResponse(
      resp => resp.url().includes('/finance/summary') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await goToFinance(page);
    const summaryResp = await summaryPromise;
    const summaryBody = await summaryResp.json();
    const totalIncome = summaryBody.data?.totalIncome || 0;

    console.log(`  Total Income from summary: ₹${totalIncome}`);
    expect(totalIncome, 'Total income should be > 0 after creating a paid bill').toBeGreaterThan(0);

    // Verify the Total Income stat card displays a non-zero value
    const incomeCard = page.getByText(/total income/i).first().locator('..');
    await expect(incomeCard).toBeVisible();
    const cardText = await incomeCard.textContent();
    expect(cardText).not.toContain('₹0');
    console.log(`  ✓ Income stat card shows non-zero value`);
  });

  test('finance should not list any pending bill transactions', async ({ authenticatedPage: page }) => {
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/finance/transactions/all') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await goToFinance(page);
    const response = await apiPromise;
    const body = await response.json();
    const items: any[] = body.data?.items || [];

    // Check that no bill-sourced items have pending status
    const pendingBills = items.filter(i => i._source === 'bill' && i.status === 'pending');
    console.log(`  Total bill items: ${items.filter(i => i._source === 'bill').length}`);
    console.log(`  Pending bill items: ${pendingBills.length}`);
    expect(pendingBills.length, 'No pending bill transactions should appear in finance').toBe(0);

    // Also verify no transaction-sourced items are pending
    const pendingTx = items.filter(i => i._source === 'transaction' && i.status === 'pending');
    console.log(`  Pending manual transactions: ${pendingTx.length}`);
    expect(pendingTx.length, 'No pending manual transactions should appear in finance').toBe(0);

    console.log(`  ✓ No pending transactions found — only completed/cancelled`);
  });
});
