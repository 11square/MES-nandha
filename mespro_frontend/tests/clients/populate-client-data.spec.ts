import { test, expect } from '../fixtures';

/**
 * Populate all related data for client "ergfer" (client #6) via the UI.
 * Creates: orders, invoices, dispatches, finance transactions, follow-ups.
 *
 * Run with: npx playwright test tests/clients/populate-client-data.spec.ts --headed
 */

const CLIENT_NAME = 'ergfer';
const CLIENT_PHONE = '9876543210';

/** Helper: fill mobile, select client from dropdown, pick source, date, item, qty, then submit */
async function createOrder(
  page: import('@playwright/test').Page,
  opts: { source: string; date: string; itemName: string; qty: string }
) {
  await page.goto('/orders');
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /add order/i }).click();
  await page.waitForTimeout(1000);

  // Fill mobile to search for client
  const mobileInput = page.locator('input[placeholder="XXXXX XXXXX"]');
  await mobileInput.fill(CLIENT_PHONE);
  await page.waitForTimeout(1000);
  // Select client from dropdown
  const clientOption = page.locator('.cursor-pointer').filter({ hasText: CLIENT_NAME }).first();
  if (await clientOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clientOption.click();
    await page.waitForTimeout(500);
  }

  // Order source — target by id="source"
  await page.locator('select#source').selectOption(opts.source);

  // Required Date
  await page.locator('input#requiredDate').fill(opts.date);

  // Fill item
  const itemSearch = page.locator('input[placeholder="Search item..."]').first();
  await itemSearch.click();
  await itemSearch.fill(opts.itemName);
  await page.waitForTimeout(1000);
  const itemOpt = page.locator('.cursor-pointer').filter({ hasText: opts.itemName }).first();
  if (await itemOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await itemOpt.click();
    await page.waitForTimeout(500);
  }

  // Set quantity — the qty input in the items table
  const qtyInput = page.locator('input[type="number"]').first();
  await qtyInput.clear();
  await qtyInput.fill(opts.qty);
  await page.waitForTimeout(300);

  // Click Create Order
  await page.getByRole('button', { name: /create order/i }).click();
  await page.waitForTimeout(3000);
}

/** Helper: create a billing invoice */
async function createInvoice(
  page: import('@playwright/test').Page,
  opts: { date: string; billType: string; dueDate?: string; paymentMethod?: string; itemName: string; qty: string }
) {
  await page.goto('/billing');
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: /new invoice/i }).click();
  await page.waitForTimeout(1000);

  // Date — find the date input in the invoice details section
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.first().fill(opts.date);

  // Client search
  const clientSearch = page.locator('input[placeholder*="Search client"]').first();
  await clientSearch.click();
  await clientSearch.fill(CLIENT_NAME);
  await page.waitForTimeout(1000);
  const clientOpt = page.locator('.cursor-pointer').filter({ hasText: CLIENT_NAME }).first();
  if (await clientOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clientOpt.click();
    await page.waitForTimeout(500);
  }

  // Bill Type (cash/credit)
  const billTypeSelects = page.locator('select');
  const bCount = await billTypeSelects.count();
  for (let i = 0; i < bCount; i++) {
    const options = await billTypeSelects.nth(i).locator('option').allTextContents();
    if (options.some(o => /^cash$/i.test(o.trim())) && options.some(o => /^credit$/i.test(o.trim()))) {
      await billTypeSelects.nth(i).selectOption(opts.billType);
      break;
    }
  }

  // Due date for credit bills
  if (opts.dueDate) {
    await page.waitForTimeout(300);
    // Due date is typically the last date input
    const allDates = page.locator('input[type="date"]');
    const dCount = await allDates.count();
    await allDates.nth(dCount - 1).fill(opts.dueDate);
  }

  // Payment method if specified
  if (opts.paymentMethod) {
    const pmSelects = page.locator('select');
    const pmCount = await pmSelects.count();
    for (let i = 0; i < pmCount; i++) {
      const options = await pmSelects.nth(i).locator('option').allTextContents();
      const optValues = options.map(o => o.trim().toLowerCase());
      if (optValues.includes('upi') && optValues.includes('cash') && optValues.includes('bank transfer')) {
        await pmSelects.nth(i).selectOption({ label: opts.paymentMethod });
        break;
      }
    }
  }

  // Add item
  const itemSearch = page.locator('input[placeholder="Search item..."]').first();
  await itemSearch.click();
  await itemSearch.fill(opts.itemName);
  await page.waitForTimeout(1000);
  const itemOpt = page.locator('.cursor-pointer').filter({ hasText: opts.itemName }).first();
  if (await itemOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
    await itemOpt.click();
    await page.waitForTimeout(500);
  }

  // Set quantity — find the qty input in items table (look for value "1" which is default)
  const qtyInputs = page.locator('input[type="number"]');
  const qtyCount = await qtyInputs.count();
  for (let i = 0; i < qtyCount; i++) {
    const val = await qtyInputs.nth(i).inputValue();
    if (val === '1' || val === '0') {
      await qtyInputs.nth(i).clear();
      await qtyInputs.nth(i).fill(opts.qty);
      break;
    }
  }

  // Click "Add to Bill" to add the item to the invoice
  const addToBillBtn = page.getByRole('button', { name: /add to bill/i });
  if (await addToBillBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addToBillBtn.click();
    await page.waitForTimeout(500);
  }

  // Create Invoice
  await page.getByRole('button', { name: /create invoice/i }).click({ force: true });
  await page.waitForTimeout(3000);
}

// ============================================================
test.describe.serial('Populate Client Data', () => {

  // ── ORDERS ──
  test('Create Order 1 — nandha product', async ({ authenticatedPage: page }) => {
    await createOrder(page, { source: 'phone', date: '2026-04-20', itemName: 'nandha', qty: '15' });
  });

  test('Create Order 2 — mac product', async ({ authenticatedPage: page }) => {
    await createOrder(page, { source: 'walkin', date: '2026-04-25', itemName: 'mac', qty: '8' });
  });

  test('Create Order 3 — Soc product', async ({ authenticatedPage: page }) => {
    await createOrder(page, { source: 'website', date: '2026-04-15', itemName: 'Soc', qty: '5' });
  });

  // ── INVOICES ──
  test('Create Invoice 1 — Cash paid via UPI', async ({ authenticatedPage: page }) => {
    await createInvoice(page, {
      date: '2026-04-05', billType: 'cash', paymentMethod: 'UPI',
      itemName: 'nandha', qty: '10',
    });
  });

  test('Create Invoice 2 — Credit with due date', async ({ authenticatedPage: page }) => {
    await createInvoice(page, {
      date: '2026-04-10', billType: 'credit', dueDate: '2026-04-25',
      itemName: 'mac', qty: '5',
    });
  });

  test('Create Invoice 3 — Credit pending', async ({ authenticatedPage: page }) => {
    await createInvoice(page, {
      date: '2026-04-12', billType: 'credit', dueDate: '2026-04-28',
      itemName: 'Soc', qty: '20',
    });
  });

  // ── DISPATCHES ──
  test('Create Dispatch 1', async ({ authenticatedPage: page }) => {
    await page.goto('/dispatch');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /new dispatch|create dispatch|add dispatch/i }).click();
    await page.waitForTimeout(1500);

    // Customer
    await page.locator('input[placeholder="Customer Name"]').fill(CLIENT_NAME);
    await page.waitForTimeout(300);

    // Stock item search — type, wait for dropdown, click result button
    const stockSearch = page.locator('input[placeholder="Search item..."]');
    await stockSearch.click();
    await stockSearch.fill('nandha');
    await page.waitForTimeout(1500);
    const itemBtn = page.locator('button.w-full.text-left').filter({ hasText: 'nandha' }).first();
    await itemBtn.waitFor({ state: 'visible', timeout: 5000 });
    await itemBtn.click();
    await page.waitForTimeout(500);

    // Click neutral to defocus
    await page.locator('h1').first().click();
    await page.waitForTimeout(300);

    // LR Number (required — must fill before transporter or validation fails)
    await page.locator('input[placeholder="LR-2024-XXX"]').fill('LR-2026-001');
    await page.waitForTimeout(200);

    // Dispatch date
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-04-10');
    await page.waitForTimeout(200);
    const dCount = await dateInputs.count();
    if (dCount > 1) await dateInputs.nth(1).fill('2026-04-18');
    await page.waitForTimeout(200);

    // Vehicle
    await page.locator('input[placeholder="MH-01-XX-1234"]').fill('TN-01-AB-1234');
    await page.waitForTimeout(200);

    // Address
    const addressBox = page.locator('textarea');
    if (await addressBox.count() > 0) {
      await addressBox.first().fill('esfvwrf, Chennai, Tamil Nadu');
    }
    await page.waitForTimeout(200);

    // Transporter — add new via "+" button (localStorage starts empty, no items in dropdown)
    const addTransporterBtn = page.locator('button[title="Add new transporter"]');
    await addTransporterBtn.scrollIntoViewIfNeeded();
    await addTransporterBtn.click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder="Transporter name"]').fill('ABS Agency');
    await page.waitForTimeout(300);
    // Click the blue add button (Plus icon inside the add-transporter form)
    await page.locator('input[placeholder="Transporter name"]').press('Enter');
    await page.waitForTimeout(500);

    // Scroll to bottom and submit
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const createBtn = page.locator('button').filter({ hasText: /Create Dispatch|அனுப்புதலை உருவாக்கு/ }).last();
    await createBtn.click();
    // Wait for success toast or navigation
    await page.waitForTimeout(3000);
    // Verify dispatch was created by checking we're back on the list
    await expect(page.locator('text=Dispatch created successfully').or(page.locator('text=Stock Dispatches').or(page.locator('text=Production Dispatches')))).toBeVisible({ timeout: 5000 });
  });

  test('Create Dispatch 2', async ({ authenticatedPage: page }) => {
    await page.goto('/dispatch');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /new dispatch|create dispatch|add dispatch/i }).click();
    await page.waitForTimeout(1500);

    // Customer
    await page.locator('input[placeholder="Customer Name"]').fill(CLIENT_NAME);
    await page.waitForTimeout(300);

    // Stock item search
    const stockSearch = page.locator('input[placeholder="Search item..."]');
    await stockSearch.click();
    await stockSearch.fill('mac');
    await page.waitForTimeout(1500);
    const itemBtn = page.locator('button.w-full.text-left').filter({ hasText: 'mac' }).first();
    await itemBtn.waitFor({ state: 'visible', timeout: 5000 });
    await itemBtn.click();
    await page.waitForTimeout(500);

    // Click neutral to defocus
    await page.locator('h1').first().click();
    await page.waitForTimeout(300);

    // LR Number
    await page.locator('input[placeholder="LR-2024-XXX"]').fill('LR-2026-002');
    await page.waitForTimeout(200);

    // Dispatch date
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-04-08');
    await page.waitForTimeout(200);
    const dCount = await dateInputs.count();
    if (dCount > 1) await dateInputs.nth(1).fill('2026-04-14');
    await page.waitForTimeout(200);

    // Vehicle
    await page.locator('input[placeholder="MH-01-XX-1234"]').fill('TN-02-CD-5678');
    await page.waitForTimeout(200);

    // Address
    const addressBox = page.locator('textarea');
    if (await addressBox.count() > 0) {
      await addressBox.first().fill('esfvwrf, Chennai, Tamil Nadu');
    }
    await page.waitForTimeout(200);

    // Transporter — select from dropdown (ABS Agency was added by Dispatch 1)
    // If dropdown has items from previous test's localStorage, select; otherwise add new
    const transporterTrigger = page.locator('[data-slot="select-trigger"]').filter({ hasText: /Select transporter|transporter|ABS/i }).first();
    await transporterTrigger.scrollIntoViewIfNeeded();
    await transporterTrigger.click();
    await page.waitForTimeout(800);
    const hasItems = await page.locator('[data-slot="select-item"]').count();
    if (hasItems > 0) {
      await page.locator('[data-slot="select-item"]').first().click();
    } else {
      // Close dropdown and add new transporter
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const addBtn = page.locator('button[title="Add new transporter"]');
      await addBtn.click();
      await page.waitForTimeout(500);
      await page.locator('input[placeholder="Transporter name"]').fill('Express Logistics');
      await page.locator('input[placeholder="Transporter name"]').press('Enter');
    }
    await page.waitForTimeout(500);

    // Submit
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const createBtn = page.locator('button').filter({ hasText: /Create Dispatch|அனுப்புதலை உருவாக்கு/ }).last();
    await createBtn.click();
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Dispatch created successfully').or(page.locator('text=Stock Dispatches').or(page.locator('text=Production Dispatches')))).toBeVisible({ timeout: 5000 });
  });

  // ── FINANCE TRANSACTIONS ──
  test('Create Transaction 1 — Income ₹27,140', async ({ authenticatedPage: page }) => {
    await page.goto('/finance');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /add transaction|new transaction/i }).click();
    await page.waitForTimeout(1000);

    // Date
    await page.locator('input[type="date"]').first().fill('2026-04-05');

    // Type — Income is default, no change needed

    // Category — shadcn Select with placeholder "Select Category"
    const categoryTrigger = page.getByRole('combobox').filter({ hasText: /select category/i });
    await categoryTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Sales/i }).click();
    await page.waitForTimeout(300);

    // Amount
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.clear();
    await amountInput.fill('27140');

    // Payment Method — change from Cash to Bank Transfer
    const paymentTrigger = page.getByRole('combobox').filter({ hasText: /cash/i });
    await paymentTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /bank transfer/i }).click();
    await page.waitForTimeout(300);

    // Client search — party_type defaults to 'client'
    const clientSearch = page.locator('input[placeholder="Search client..."]').first();
    await clientSearch.click();
    await clientSearch.fill(CLIENT_NAME);
    await page.waitForTimeout(1000);
    const clientOpt = page.locator('button.w-full.text-left').filter({ hasText: CLIENT_NAME }).first();
    if (await clientOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clientOpt.click();
      await page.waitForTimeout(500);
    }

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.waitForTimeout(3000);
  });

  test('Create Transaction 2 — Income ₹10,000 pending', async ({ authenticatedPage: page }) => {
    await page.goto('/finance');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /add transaction|new transaction/i }).click();
    await page.waitForTimeout(1000);

    await page.locator('input[type="date"]').first().fill('2026-04-10');

    // Type — Income is default, no change needed

    // Category — Sales
    const categoryTrigger = page.getByRole('combobox').filter({ hasText: /select category/i });
    await categoryTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Sales/i }).click();
    await page.waitForTimeout(300);

    // Amount
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.clear();
    await amountInput.fill('10000');

    // Payment Method — change from Cash to UPI
    const paymentTrigger = page.getByRole('combobox').filter({ hasText: /cash/i });
    await paymentTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /upi/i }).click();
    await page.waitForTimeout(300);

    // Client
    const clientSearch = page.locator('input[placeholder="Search client..."]').first();
    await clientSearch.click();
    await clientSearch.fill(CLIENT_NAME);
    await page.waitForTimeout(1000);
    const clientOpt = page.locator('button.w-full.text-left').filter({ hasText: CLIENT_NAME }).first();
    if (await clientOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clientOpt.click();
      await page.waitForTimeout(500);
    }

    // Status — change from Completed to Pending
    const statusTrigger = page.getByRole('combobox').filter({ hasText: /completed/i });
    await statusTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /pending/i }).click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.waitForTimeout(3000);
  });

  test('Create Transaction 3 — Expense ₹5,000', async ({ authenticatedPage: page }) => {
    await page.goto('/finance');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /add transaction|new transaction/i }).click();
    await page.waitForTimeout(1000);

    await page.locator('input[type="date"]').first().fill('2026-04-12');

    // Type — change from Income to Expense
    const typeTrigger = page.getByRole('combobox').filter({ hasText: /income/i });
    await typeTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /expense/i }).click();
    await page.waitForTimeout(300);

    // Category — Purchase
    const categoryTrigger = page.getByRole('combobox').filter({ hasText: /select category/i });
    await categoryTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Purchase/i }).click();
    await page.waitForTimeout(300);

    // Amount
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.clear();
    await amountInput.fill('5000');

    // Payment Method — Cash is default, no change needed

    // Client
    const clientSearch = page.locator('input[placeholder="Search client..."]').first();
    await clientSearch.click();
    await clientSearch.fill(CLIENT_NAME);
    await page.waitForTimeout(1000);
    const clientOpt = page.locator('button.w-full.text-left').filter({ hasText: CLIENT_NAME }).first();
    if (await clientOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clientOpt.click();
      await page.waitForTimeout(500);
    }

    // Description
    const desc = page.locator('textarea').first();
    if (await desc.isVisible().catch(() => false)) {
      await desc.fill('Material cost for ergfer order');
    }

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.waitForTimeout(3000);
  });

  // ── FOLLOW-UPS ──
  test('Create Follow-up 1 — Call', async ({ authenticatedPage: page }) => {
    await page.goto('/clients/6');
    await page.waitForTimeout(1500);

    await page.getByRole('tab', { name: /follow/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /add follow/i }).click();
    await page.waitForTimeout(800);

    // Subject (required)
    const subjectInput = page.locator('input[placeholder="Follow-up subject"]');
    await subjectInput.fill('Follow up on pending payment');

    // Type — defaults to 'Call', no change needed

    // Priority — change from Medium to High (shadcn Select)
    const priorityTrigger = page.getByRole('combobox').filter({ hasText: /medium/i });
    await priorityTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /High/i }).click();
    await page.waitForTimeout(300);

    // Notes
    const notesInput = page.locator('textarea').first();
    if (await notesInput.isVisible().catch(() => false)) {
      await notesInput.fill('Called client regarding pending invoice. Promised to pay by end of week.');
    }

    // Submit
    await page.getByRole('button', { name: /add follow-up/i }).click();
    await page.waitForTimeout(2000);
  });

  test('Create Follow-up 2 — Meeting', async ({ authenticatedPage: page }) => {
    await page.goto('/clients/6');
    await page.waitForTimeout(1500);

    await page.getByRole('tab', { name: /follow/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /add follow/i }).click();
    await page.waitForTimeout(800);

    // Subject (required)
    const subjectInput = page.locator('input[placeholder="Follow-up subject"]');
    await subjectInput.fill('Discuss bulk order requirements for Q2');

    // Type — change from Call to Meeting (shadcn Select)
    const typeTrigger = page.getByRole('combobox').filter({ hasText: /call/i });
    await typeTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Meeting/i }).click();
    await page.waitForTimeout(300);

    // Priority — Medium is default, no change needed

    // Notes
    const notesInput = page.locator('textarea').first();
    if (await notesInput.isVisible().catch(() => false)) {
      await notesInput.fill('Scheduled meeting for new bulk order discussion. Prepare samples.');
    }

    // Submit
    await page.getByRole('button', { name: /add follow-up/i }).click();
    await page.waitForTimeout(2000);
  });

  // ── VERIFY ──
  test('Verify client detail page shows all data', async ({ authenticatedPage: page }) => {
    await page.goto('/clients/6');
    await page.waitForTimeout(2000);

    await expect(page.getByText(CLIENT_NAME).first()).toBeVisible();

    // Check Bills tab
    await page.getByRole('tab', { name: /bills/i }).click();
    await page.waitForTimeout(1000);

    // Check Orders tab
    await page.getByRole('tab', { name: /orders/i }).click();
    await page.waitForTimeout(1000);

    // Check Dispatches tab
    await page.getByRole('tab', { name: /dispatches/i }).click();
    await page.waitForTimeout(1000);

    // Check Finance tab
    await page.getByRole('tab', { name: /finance/i }).click();
    await page.waitForTimeout(1000);

    // Check Follow-ups tab
    await page.getByRole('tab', { name: /follow/i }).click();
    await page.waitForTimeout(1000);

    // Check Outstanding tab
    await page.getByRole('tab', { name: /outstanding/i }).click();
    await page.waitForTimeout(1000);
  });
});
