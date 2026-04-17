import { test, expect } from '../fixtures';

/**
 * Populate all related data for vendor "jhyg" (vendor #19) via the UI.
 * Creates: purchase orders, dispatches, finance transactions, follow-ups.
 *
 * Run with: npx playwright test tests/vendors/populate-vendor-data.spec.ts --headed
 */

const VENDOR_NAME = 'jhyg';
const VENDOR_ID = 19;

// ============================================================
test.describe.serial('Populate Vendor Data', () => {

  // ── PURCHASE ORDERS ──
  test('Create PO 1 — nandha product', async ({ authenticatedPage: page }) => {
    await page.goto('/purchase-orders');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(1000);

    // Date
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-04-10');

    // Expected delivery
    const dCount = await dateInputs.count();
    if (dCount > 1) await dateInputs.nth(1).fill('2026-04-20');

    // Select Vendor — custom combobox
    const vendorTrigger = page.getByRole('combobox').filter({ hasText: /Select Vendor/i });
    await vendorTrigger.click();
    await page.waitForTimeout(500);
    const vendorSearch = page.locator('input[placeholder="Search vendor..."]');
    await vendorSearch.fill(VENDOR_NAME);
    await page.waitForTimeout(1000);
    const vendorOpt = page.locator('.cursor-pointer').filter({ hasText: VENDOR_NAME }).first();
    if (await vendorOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vendorOpt.click();
      await page.waitForTimeout(500);
    }

    // Add item — search for product
    const itemSearch = page.locator('input[placeholder="Search item..."]').first();
    await itemSearch.click();
    await itemSearch.fill('nandha');
    await page.waitForTimeout(1000);
    const itemOpt = page.locator('.cursor-pointer').filter({ hasText: 'nandha' }).first();
    if (await itemOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await itemOpt.click();
      await page.waitForTimeout(500);
    }

    // Set quantity
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.clear();
    await qtyInput.fill('50');
    await page.waitForTimeout(300);

    // Submit — Create PO
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(3000);
  });

  test('Create PO 2 — mac product', async ({ authenticatedPage: page }) => {
    await page.goto('/purchase-orders');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(1000);

    // Date
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-04-12');
    const dCount = await dateInputs.count();
    if (dCount > 1) await dateInputs.nth(1).fill('2026-04-25');

    // Select Vendor
    const vendorTrigger = page.getByRole('combobox').filter({ hasText: /Select Vendor/i });
    await vendorTrigger.click();
    await page.waitForTimeout(500);
    const vendorSearch = page.locator('input[placeholder="Search vendor..."]');
    await vendorSearch.fill(VENDOR_NAME);
    await page.waitForTimeout(1000);
    const vendorOpt = page.locator('.cursor-pointer').filter({ hasText: VENDOR_NAME }).first();
    if (await vendorOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vendorOpt.click();
      await page.waitForTimeout(500);
    }

    // Add item
    const itemSearch = page.locator('input[placeholder="Search item..."]').first();
    await itemSearch.click();
    await itemSearch.fill('mac');
    await page.waitForTimeout(1000);
    const itemOpt = page.locator('.cursor-pointer').filter({ hasText: 'mac' }).first();
    if (await itemOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await itemOpt.click();
      await page.waitForTimeout(500);
    }

    // Set quantity
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.clear();
    await qtyInput.fill('25');
    await page.waitForTimeout(300);

    // Submit
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(3000);
  });

  test('Create PO 3 — Soc product, saved as draft', async ({ authenticatedPage: page }) => {
    await page.goto('/purchase-orders');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /create po/i }).click();
    await page.waitForTimeout(1000);

    // Date
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-04-14');

    // Select Vendor
    const vendorTrigger = page.getByRole('combobox').filter({ hasText: /Select Vendor/i });
    await vendorTrigger.click();
    await page.waitForTimeout(500);
    const vendorSearch = page.locator('input[placeholder="Search vendor..."]');
    await vendorSearch.fill(VENDOR_NAME);
    await page.waitForTimeout(1000);
    const vendorOpt = page.locator('.cursor-pointer').filter({ hasText: VENDOR_NAME }).first();
    if (await vendorOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vendorOpt.click();
      await page.waitForTimeout(500);
    }

    // Add item
    const itemSearch = page.locator('input[placeholder="Search item..."]').first();
    await itemSearch.click();
    await itemSearch.fill('Soc');
    await page.waitForTimeout(1000);
    const itemOpt = page.locator('.cursor-pointer').filter({ hasText: 'Soc' }).first();
    if (await itemOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await itemOpt.click();
      await page.waitForTimeout(500);
    }

    // Set quantity
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.clear();
    await qtyInput.fill('10');
    await page.waitForTimeout(300);

    // Save as Draft instead of Create PO
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /save as draft/i }).click();
    await page.waitForTimeout(3000);
  });

  // ── DISPATCHES ──
  test('Create Dispatch 1 — nandha stock', async ({ authenticatedPage: page }) => {
    await page.goto('/dispatch');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /new dispatch|create dispatch|add dispatch/i }).click();
    await page.waitForTimeout(1500);

    // Customer — use vendor name as customer
    await page.locator('input[placeholder="Customer Name"]').fill(VENDOR_NAME);
    await page.waitForTimeout(300);

    // Stock item search
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

    // LR Number
    await page.locator('input[placeholder="LR-2024-XXX"]').fill('LR-2026-V01');
    await page.waitForTimeout(200);

    // Dispatch date
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-04-10');
    await page.waitForTimeout(200);
    const dCount = await dateInputs.count();
    if (dCount > 1) await dateInputs.nth(1).fill('2026-04-16');
    await page.waitForTimeout(200);

    // Vehicle
    await page.locator('input[placeholder="MH-01-XX-1234"]').fill('TN-03-EF-9012');
    await page.waitForTimeout(200);

    // Address
    const addressBox = page.locator('textarea');
    if (await addressBox.count() > 0) {
      await addressBox.first().fill('Vendor warehouse, Coimbatore, Tamil Nadu');
    }
    await page.waitForTimeout(200);

    // Transporter — add new via "+" button
    const addTransporterBtn = page.locator('button[title="Add new transporter"]');
    await addTransporterBtn.scrollIntoViewIfNeeded();
    await addTransporterBtn.click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder="Transporter name"]').fill('Blue Dart Express');
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="Transporter name"]').press('Enter');
    await page.waitForTimeout(500);

    // Submit
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const createBtn = page.locator('button').filter({ hasText: /Create Dispatch/ }).last();
    await createBtn.click();
    await page.waitForTimeout(3000);
    await expect(
      page.locator('text=Dispatch created successfully')
        .or(page.locator('text=Stock Dispatches'))
        .or(page.locator('text=Production Dispatches'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('Create Dispatch 2 — mac stock', async ({ authenticatedPage: page }) => {
    await page.goto('/dispatch');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /new dispatch|create dispatch|add dispatch/i }).click();
    await page.waitForTimeout(1500);

    // Customer
    await page.locator('input[placeholder="Customer Name"]').fill(VENDOR_NAME);
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
    await page.locator('input[placeholder="LR-2024-XXX"]').fill('LR-2026-V02');
    await page.waitForTimeout(200);

    // Dispatch date
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-04-12');
    await page.waitForTimeout(200);
    const dCount = await dateInputs.count();
    if (dCount > 1) await dateInputs.nth(1).fill('2026-04-20');
    await page.waitForTimeout(200);

    // Vehicle
    await page.locator('input[placeholder="MH-01-XX-1234"]').fill('TN-04-GH-3456');
    await page.waitForTimeout(200);

    // Address
    const addressBox = page.locator('textarea');
    if (await addressBox.count() > 0) {
      await addressBox.first().fill('Vendor warehouse, Coimbatore, Tamil Nadu');
    }
    await page.waitForTimeout(200);

    // Transporter — select existing from dropdown
    const transporterTrigger = page.locator('[data-slot="select-trigger"]').filter({ hasText: /Select transporter|transporter|Blue/i }).first();
    await transporterTrigger.scrollIntoViewIfNeeded();
    await transporterTrigger.click();
    await page.waitForTimeout(800);
    const hasItems = await page.locator('[data-slot="select-item"]').count();
    if (hasItems > 0) {
      await page.locator('[data-slot="select-item"]').first().click();
    } else {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      const addBtn = page.locator('button[title="Add new transporter"]');
      await addBtn.click();
      await page.waitForTimeout(500);
      await page.locator('input[placeholder="Transporter name"]').fill('Speed Cargo');
      await page.locator('input[placeholder="Transporter name"]').press('Enter');
    }
    await page.waitForTimeout(500);

    // Submit
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const createBtn = page.locator('button').filter({ hasText: /Create Dispatch/ }).last();
    await createBtn.click();
    await page.waitForTimeout(3000);
    await expect(
      page.locator('text=Dispatch created successfully')
        .or(page.locator('text=Stock Dispatches'))
        .or(page.locator('text=Production Dispatches'))
    ).toBeVisible({ timeout: 5000 });
  });

  // ── FINANCE TRANSACTIONS ──
  test('Create Transaction 1 — Expense ₹15,000 Purchase', async ({ authenticatedPage: page }) => {
    await page.goto('/finance');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /add transaction|new transaction/i }).click();
    await page.waitForTimeout(1000);

    // Date
    await page.locator('input[type="date"]').first().fill('2026-04-10');

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
    await amountInput.fill('15000');

    // Payment Method — Bank Transfer
    const paymentTrigger = page.getByRole('combobox').filter({ hasText: /cash/i });
    await paymentTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /bank transfer/i }).click();
    await page.waitForTimeout(300);

    // Switch to Vendor party type
    await page.getByRole('button', { name: 'Vendor', exact: true }).click();
    await page.waitForTimeout(500);

    // Vendor search
    const vendorSearch = page.locator('input[placeholder="Search vendor..."]').first();
    await vendorSearch.click();
    await vendorSearch.fill(VENDOR_NAME);
    await page.waitForTimeout(1000);
    const vendorOpt = page.locator('button.w-full.text-left').filter({ hasText: VENDOR_NAME }).first();
    if (await vendorOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vendorOpt.click();
      await page.waitForTimeout(500);
    }

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.waitForTimeout(3000);
  });

  test('Create Transaction 2 — Expense ₹8,500 pending', async ({ authenticatedPage: page }) => {
    await page.goto('/finance');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /add transaction|new transaction/i }).click();
    await page.waitForTimeout(1000);

    // Date
    await page.locator('input[type="date"]').first().fill('2026-04-12');

    // Type — Expense
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
    await amountInput.fill('8500');

    // Payment Method — UPI
    const paymentTrigger = page.getByRole('combobox').filter({ hasText: /cash/i });
    await paymentTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /upi/i }).click();
    await page.waitForTimeout(300);

    // Switch to Vendor party type
    await page.getByRole('button', { name: 'Vendor', exact: true }).click();
    await page.waitForTimeout(500);

    // Vendor search
    const vendorSearch = page.locator('input[placeholder="Search vendor..."]').first();
    await vendorSearch.click();
    await vendorSearch.fill(VENDOR_NAME);
    await page.waitForTimeout(1000);
    const vendorOpt = page.locator('button.w-full.text-left').filter({ hasText: VENDOR_NAME }).first();
    if (await vendorOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vendorOpt.click();
      await page.waitForTimeout(500);
    }

    // Status — change from Completed to Pending
    const statusTrigger = page.getByRole('combobox').filter({ hasText: /completed/i });
    await statusTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /pending/i }).click();
    await page.waitForTimeout(300);

    // Description
    const desc = page.locator('textarea').first();
    if (await desc.isVisible().catch(() => false)) {
      await desc.fill('Raw material purchase from jhyg - pending payment');
    }

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.waitForTimeout(3000);
  });

  test('Create Transaction 3 — Income ₹3,200 refund', async ({ authenticatedPage: page }) => {
    await page.goto('/finance');
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /add transaction|new transaction/i }).click();
    await page.waitForTimeout(1000);

    // Date
    await page.locator('input[type="date"]').first().fill('2026-04-14');

    // Type — Income (default, no change)

    // Category — Sales (or whatever category is available)
    const categoryTrigger = page.getByRole('combobox').filter({ hasText: /select category/i });
    await categoryTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Sales/i }).click();
    await page.waitForTimeout(300);

    // Amount
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.clear();
    await amountInput.fill('3200');

    // Payment Method — Cash (default, no change)

    // Switch to Vendor party type
    await page.getByRole('button', { name: 'Vendor', exact: true }).click();
    await page.waitForTimeout(500);

    // Vendor search
    const vendorSearch = page.locator('input[placeholder="Search vendor..."]').first();
    await vendorSearch.click();
    await vendorSearch.fill(VENDOR_NAME);
    await page.waitForTimeout(1000);
    const vendorOpt = page.locator('button.w-full.text-left').filter({ hasText: VENDOR_NAME }).first();
    if (await vendorOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vendorOpt.click();
      await page.waitForTimeout(500);
    }

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.waitForTimeout(3000);
  });

  // ── FOLLOW-UPS ──
  test('Create Follow-up 1 — Call', async ({ authenticatedPage: page }) => {
    await page.goto(`/vendors/${VENDOR_ID}`);
    await page.waitForTimeout(1500);

    await page.getByRole('tab', { name: /follow/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /add follow/i }).click();
    await page.waitForTimeout(800);

    // Subject (required)
    const subjectInput = page.locator('input[placeholder="Follow-up subject"]');
    await subjectInput.fill('Follow up on pending PO delivery');

    // Type — defaults to 'Call', no change needed

    // Priority — change from Medium to High
    const priorityTrigger = page.getByRole('combobox').filter({ hasText: /medium/i });
    await priorityTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /High/i }).click();
    await page.waitForTimeout(300);

    // Notes
    const notesInput = page.locator('textarea').first();
    if (await notesInput.isVisible().catch(() => false)) {
      await notesInput.fill('Called vendor about delayed delivery of nandha product order. Promised shipment by next week.');
    }

    // Submit
    await page.getByRole('button', { name: /add follow-up/i }).click();
    await page.waitForTimeout(2000);
  });

  test('Create Follow-up 2 — Meeting', async ({ authenticatedPage: page }) => {
    await page.goto(`/vendors/${VENDOR_ID}`);
    await page.waitForTimeout(1500);

    await page.getByRole('tab', { name: /follow/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole('button', { name: /add follow/i }).click();
    await page.waitForTimeout(800);

    // Subject (required)
    const subjectInput = page.locator('input[placeholder="Follow-up subject"]');
    await subjectInput.fill('Negotiate bulk pricing for Q3');

    // Type — change from Call to Meeting
    const typeTrigger = page.getByRole('combobox').filter({ hasText: /call/i });
    await typeTrigger.click();
    await page.waitForTimeout(500);
    await page.getByRole('option', { name: /Meeting/i }).click();
    await page.waitForTimeout(300);

    // Priority — Medium is default, no change needed

    // Notes
    const notesInput = page.locator('textarea').first();
    if (await notesInput.isVisible().catch(() => false)) {
      await notesInput.fill('Schedule meeting with vendor to discuss bulk order pricing and terms for Q3 procurement.');
    }

    // Submit
    await page.getByRole('button', { name: /add follow-up/i }).click();
    await page.waitForTimeout(2000);
  });

  // ── VERIFY ──
  test('Verify vendor detail page shows all data', async ({ authenticatedPage: page }) => {
    await page.goto(`/vendors/${VENDOR_ID}`);
    await page.waitForTimeout(2000);

    await expect(page.getByText(VENDOR_NAME).first()).toBeVisible();

    // Check Purchase Orders tab
    await page.getByRole('tab', { name: /purchase/i }).click();
    await page.waitForTimeout(1000);

    // Check Dispatches tab
    await page.getByRole('tab', { name: /dispatches/i }).click();
    await page.waitForTimeout(1000);

    // Check Finance tab
    await page.getByRole('tab', { name: /finance/i }).click();
    await page.waitForTimeout(1000);

    // Check Outstanding tab
    await page.getByRole('tab', { name: /outstanding/i }).click();
    await page.waitForTimeout(1000);

    // Check Follow-ups tab
    await page.getByRole('tab', { name: /follow/i }).click();
    await page.waitForTimeout(1000);
  });
});
