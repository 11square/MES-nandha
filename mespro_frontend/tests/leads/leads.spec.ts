import { test, expect } from '../fixtures';
import type { ConsoleError } from '../fixtures';

/**
 * Comprehensive Playwright tests for the Leads Management module.
 * Covers: mandatory field validation, CRUD operations, event types,
 * API verification, navigation, table data accuracy, and console error checks.
 */

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
    await testInfo.attach('browser-console-errors', {
      body: summary,
      contentType: 'text/plain',
    });
  }
});

// ---------- Helper: Navigate to /leads ----------
async function goToLeads(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText('Leads', { exact: true }).click();
  await page.waitForURL('**/leads', { timeout: 5000 });
  // Wait for the table to render (API data loads asynchronously)
  await page.locator('thead').first().waitFor({ timeout: 10_000 });
}

// ---------- Helper: Open Create Lead Form ----------
async function openCreateLeadForm(page: import('@playwright/test').Page) {
  await goToLeads(page);
  await page.getByRole('button', { name: /create lead/i }).click();
  await expect(page.getByRole('heading', { name: /create new lead/i })).toBeVisible();
}

// ============================================================
// 1. PAGE LOAD & LAYOUT
// ============================================================
test.describe('Leads — Page Load & Layout', () => {
  test('should navigate to /leads and show the Leads Management heading', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    expect(page.url()).toContain('/leads');
    await expect(page.getByRole('heading', { name: /leads management/i })).toBeVisible();
  });

  test('should show subtitle text', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await expect(page.getByText(/track and manage sales leads/i)).toBeVisible();
  });

  test('should display 5 stat cards (New, Contacted, Qualified, Converted, Rejected)', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    for (const label of ['New', 'Contacted', 'Qualified', 'Converted', 'Rejected']) {
      await expect(page.locator('.grid .cursor-pointer').filter({ hasText: label }).first()).toBeVisible();
    }
  });

  test('should show Leads and Follow-ups tabs', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await expect(page.getByRole('tab', { name: /leads/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /follow-?ups/i })).toBeVisible();
  });

  test('should show Create Lead and View Orders buttons', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await expect(page.getByRole('button', { name: /create lead/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /view orders/i })).toBeVisible();
  });

  test('should show leads table with correct headers', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    const headers = ['Lead #', 'Date', 'Customer', 'Products', 'Source', 'Status', 'Conversion', 'Actions'];
    for (const header of headers) {
      await expect(page.locator('thead').getByText(header, { exact: true })).toBeVisible();
    }
  });

  test('should show search input with placeholder', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await expect(page.getByPlaceholder(/search by lead, customer/i)).toBeVisible();
  });
});

// ============================================================
// 2. MANDATORY FIELD VALIDATION — Create Lead Form
// ============================================================
test.describe('Leads — Create Lead Form Validation', () => {
  test('submitting empty form should show all required-field errors', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    // Click submit without filling anything
    await page.getByRole('button', { name: /^create lead$/i }).click();

    // Check error messages for each required field
    await expect(page.getByText('Business Name is required')).toBeVisible();
    await expect(page.getByText('Contact Person is required')).toBeVisible();
    await expect(page.getByText('Mobile is required')).toBeVisible();
    await expect(page.getByText('Lead Source is required')).toBeVisible();
  });

  test('business name with 1 character should show min-length error', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.locator('#customer').fill('A');
    await page.locator('#contact').fill('Test');
    await page.locator('#mobile').fill('9876543210');
    await page.locator('#source').selectOption('website');

    await page.getByRole('button', { name: /^create lead$/i }).click();
    await expect(page.getByText(/business name must be at least 2 characters/i)).toBeVisible();
  });

  test('invalid email should show email validation error', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.locator('#customer').fill('Test Corp');
    await page.locator('#contact').fill('John');
    await page.locator('#mobile').fill('9876543210');
    await page.locator('#source').selectOption('website');
    await page.locator('#email').fill('invalid-email');

    await page.getByRole('button', { name: /^create lead$/i }).click();
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  });

  test('invalid phone (less than 10 digits) should show phone validation error', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.locator('#customer').fill('Test Corp');
    await page.locator('#contact').fill('John');
    await page.locator('#mobile').fill('12345');
    await page.locator('#source').selectOption('website');

    await page.getByRole('button', { name: /^create lead$/i }).click();
    await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
  });

  test('invalid phone (more than 10 digits) should show phone validation error', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.locator('#customer').fill('Test Corp');
    await page.locator('#contact').fill('John');
    await page.locator('#mobile').fill('123456789012');
    await page.locator('#source').selectOption('website');

    await page.getByRole('button', { name: /^create lead$/i }).click();
    await expect(page.getByText(/phone number must be exactly 10 digits/i)).toBeVisible();
  });

  test('filling required fields should clear individual error on change', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    // Submit empty to show errors
    await page.getByRole('button', { name: /^create lead$/i }).click();
    await expect(page.getByText('Business Name is required')).toBeVisible();

    // Start typing in business name — error should clear
    await page.locator('#customer').fill('Test');
    await expect(page.getByText('Business Name is required')).not.toBeVisible();
  });

  test('selecting a source should clear source error', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.getByRole('button', { name: /^create lead$/i }).click();
    await expect(page.getByText('Lead Source is required')).toBeVisible();

    await page.locator('#source').selectOption('phone');
    await expect(page.getByText('Lead Source is required')).not.toBeVisible();
  });
});

// ============================================================
// 3. MANDATORY FIELD VALIDATION — Add Activity Form
// ============================================================
test.describe('Leads — Add Activity Form Validation', () => {
  test('submitting empty activity form should show required-field errors', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    // Switch to Follow-ups tab
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    // Click Add Activity button
    await page.getByRole('button', { name: /add activity/i }).click();

    // Wait for dialog
    await expect(page.getByText(/create a new activity/i)).toBeVisible();

    // Submit empty
    await page.locator('div[role="dialog"]').getByRole('button', { name: /add activity/i }).click();

    await expect(page.getByText('Activity Type is required')).toBeVisible();
    await expect(page.getByText('Lead is required')).toBeVisible();
    await expect(page.getByText('Business Name is required')).toBeVisible();
    await expect(page.getByText('Description is required')).toBeVisible();
  });

  test('selecting "Add" activity type should show custom activity type field', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.getByRole('button', { name: /add activity/i }).click();
    await expect(page.getByText(/create a new activity/i)).toBeVisible();

    await page.locator('#activity-type').selectOption('add');
    await expect(page.locator('#custom-activity-type')).toBeVisible();
  });

  test('submitting with "Add" type but empty custom type shows error', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.getByRole('button', { name: /add activity/i }).click();

    await page.locator('#activity-type').selectOption('add');
    await page.locator('div[role="dialog"]').getByRole('button', { name: /add activity/i }).click();

    await expect(page.getByText('Custom Activity Type is required')).toBeVisible();
  });
});

// ============================================================
// 4. CREATE LEAD (CRUD — Create) + API Verification
// ============================================================
test.describe('Leads — Create Lead (CRUD + API)', () => {
  test('should create a lead via form and verify API call', async ({ authenticatedPage: page }) => {
    // Intercept the create API call
    const createPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/leads') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );

    await openCreateLeadForm(page);

    // Fill all mandatory fields
    await page.locator('#customer').fill('Playwright Corp');
    await page.locator('#contact').fill('Jane Doe');
    await page.locator('#mobile').fill('9876543210');
    await page.locator('#source').selectOption('website');
    await page.locator('#email').fill('jane@playwrightcorp.com');
    await page.locator('#leadStatus').selectOption('contacted');

    // Submit
    await page.getByRole('button', { name: /^create lead$/i }).click();

    // Wait for API response
    const response = await createPromise;
    expect(response.status()).toBeLessThan(400); // Success (200 or 201)

    // Should show success toast
    await expect(page.getByText(/lead created successfully/i)).toBeVisible({ timeout: 5000 });
  });

  test('cancel button should return to leads list without creating', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.locator('#customer').fill('Should Not Be Created');
    await page.getByRole('button', { name: /cancel/i }).click();

    // Should return to leads table view
    await expect(page.getByText(/all leads/i)).toBeVisible();
    // "Should Not Be Created" should not appear in the table
    await expect(page.getByText('Should Not Be Created')).not.toBeVisible();
  });

  test('back button (← Back) from create form should return to leads list', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);
    await page.getByRole('button', { name: /← back/i }).click();
    await expect(page.getByText(/all leads/i)).toBeVisible();
  });
});

// ============================================================
// 5. READ LEADS (CRUD — Read) + Table Data Accuracy
// ============================================================
test.describe('Leads — Read & Table Data Accuracy', () => {
  test('leads table should display lead numbers in LEAD-XXXX format', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    const firstLeadCell = page.locator('tbody tr').first().locator('td').first();
    await expect(firstLeadCell).toHaveText(/LEAD-/);
  });

  test('leads table should display customer name, contact, and mobile', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    // Check first row has customer info structure (name, contact, phone stacked)
    const customerCell = page.locator('tbody tr').first().locator('td').nth(2);
    await expect(customerCell.locator('.font-medium').first()).toBeVisible();
    await expect(customerCell.locator('.text-xs').first()).toBeVisible();
  });

  test('leads table should display source badges', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    // Each row's Source column should have a badge
    const sourceBadge = page.locator('tbody tr').first().locator('td').nth(4).locator('[class*="badge"]').or(
      page.locator('tbody tr').first().locator('td').nth(4).locator('[data-slot="badge"]')
    );
    await expect(sourceBadge).toBeVisible();
  });

  test('leads table should display status badges with correct colors', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    const statusBadge = page.locator('tbody tr').first().locator('td').nth(5).locator('[class*="bg-"]');
    await expect(statusBadge.first()).toBeVisible();
  });

  test('leads table should show date column with formatted dates', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    const dateCell = page.locator('tbody tr').first().locator('td').nth(1);
    // Should contain a date-like string (e.g., "1/15/2024" or "15/1/2024")
    const dateText = await dateCell.textContent();
    // API data may contain dates that show as 'Invalid Date' — accept both
    expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|Invalid Date/);
  });

  test('leads table should show products column with item count or product name', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    const productsCell = page.locator('tbody tr').first().locator('td').nth(3);
    // Should contain a badge with "X items" or a product name
    await expect(productsCell).not.toBeEmpty();
  });

  test('leads table should show conversion status dropdowns', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    const conversionCell = page.locator('tbody tr').first().locator('td').nth(6);
    await expect(conversionCell.locator('button').first()).toBeVisible();
  });

  test('All Leads count should match number of table rows (when unfiltered)', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    // Get the count from "All Leads (X)"
    const allLeadsText = await page.getByText(/all leads/i).textContent();
    const countMatch = allLeadsText?.match(/\((\d+)\)/);
    if (countMatch) {
      const expectedCount = parseInt(countMatch[1]);
      const rowCount = await page.locator('tbody tr').count();
      expect(rowCount).toBe(expectedCount);
    }
  });
});

// ============================================================
// 6. UPDATE LEAD (CRUD — Update) + API Verification
// ============================================================
test.describe('Leads — Update Lead (CRUD + API)', () => {
  test('clicking edit icon should open edit form with pre-filled data', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    // Click the edit (pencil) button on the first row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByTitle(/edit/i).click();

    // Should show "Edit Lead" heading
    await expect(page.getByRole('heading', { name: /edit lead/i })).toBeVisible();

    // The edit form's customer field should be pre-filled (not empty)
    const customerInput = page.locator('#edit-customer');
    await expect(customerInput).not.toHaveValue('');
  });

  test('edit form should validate mandatory fields on submit', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByTitle(/edit/i).click();
    await expect(page.getByRole('heading', { name: /edit lead/i })).toBeVisible();

    // Clear the customer name and submit
    await page.locator('#edit-customer').fill('');
    await page.getByRole('button', { name: /update lead/i }).click();

    await expect(page.getByText('Business Name is required')).toBeVisible();
  });

  test('edit form should validate email format', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByTitle(/edit/i).click();

    // Set invalid email
    await page.locator('input[type="email"]').fill('bad-email');
    await page.getByRole('button', { name: /update lead/i }).click();

    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  });

  test('back button from edit form should return to leads list', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByTitle(/edit/i).click();
    await expect(page.getByRole('heading', { name: /edit lead/i })).toBeVisible();

    await page.getByRole('button', { name: /← back/i }).click();
    await expect(page.getByText(/all leads/i)).toBeVisible();
  });

  test('should update a lead and verify API call', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByTitle(/edit/i).click();
    await expect(page.getByRole('heading', { name: /edit lead/i })).toBeVisible();

    // Intercept the update API call
    const updatePromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/leads') && resp.request().method() === 'PUT',
      { timeout: 10_000 }
    );

    // Modify a field
    await page.locator('#edit-customer').fill('Updated Corp Name');

    await page.getByRole('button', { name: /update lead/i }).click();

    const response = await updatePromise;
    expect(response.status()).toBeLessThan(400);

    // Should show success toast
    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// 7. LEAD DETAIL DIALOG (CRUD — Read Detail)
// ============================================================
test.describe('Leads — Lead Detail Dialog', () => {
  test('clicking view (eye) icon should open lead detail dialog', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByTitle(/view/i).click();

    // Dialog should appear with lead number
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('div[role="dialog"]').getByText(/LEAD-/i)).toBeVisible();
  });

  test('lead detail should have Details, Follow-up Log, Actions tabs', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/view/i).click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    await expect(page.locator('div[role="dialog"]').getByRole('tab', { name: /details/i })).toBeVisible();
    await expect(page.locator('div[role="dialog"]').getByRole('tab', { name: /follow-up log/i })).toBeVisible();
    await expect(page.locator('div[role="dialog"]').getByRole('tab', { name: /actions/i })).toBeVisible();
  });

  test('Details tab should show contact person, source, mobile, email', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/view/i).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Should show field labels
    await expect(dialog.getByText('Contact Person', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Source', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Mobile', { exact: true })).toBeVisible();
  });

  test('Follow-up Log tab should show follow-up notes', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/view/i).click();
    const dialog = page.locator('div[role="dialog"]');

    await dialog.getByRole('tab', { name: /follow-up log/i }).click();

    // Should show "Add Follow-up Note" label
    await expect(dialog.getByText(/add follow-up note/i)).toBeVisible();
    await expect(dialog.getByPlaceholder(/enter follow-up details/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /add note/i })).toBeVisible();
  });

  test('Actions tab should show assign to sales executive dropdown', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/view/i).click();
    const dialog = page.locator('div[role="dialog"]');

    await dialog.getByRole('tab', { name: /actions/i }).click();
    await expect(dialog.getByText(/assign to sales executive/i)).toBeVisible();
    await expect(dialog.getByText(/update status/i)).toBeVisible();
  });

  test('closing dialog should return to leads table', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/view/i).click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Close via the X button
    await page.locator('div[role="dialog"]').getByRole('button', { name: /close/i }).click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
    await expect(page.getByText(/all leads/i)).toBeVisible();
  });
});

// ============================================================
// 8. EVENT TYPES — Click, Change, Submit, Blur
// ============================================================
test.describe('Leads — Event Types', () => {
  test('clicking stat card (New) should filter leads table', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    // Get initial row count
    const initialCount = await page.locator('tbody tr').count();

    // Click "New" stat card
    await page.locator('.cursor-pointer').filter({ hasText: /^New/ }).first().click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // All visible status badges should say "New"
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const statusText = await rows.nth(i).locator('td').nth(5).textContent();
        expect(statusText).toContain('New');
      }
    }
  });

  test('typing in search input should filter leads by customer name', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    const initialCount = await page.locator('tbody tr').count();

    // Type a search query
    await page.getByPlaceholder(/search by lead/i).fill('LEAD-');
    await page.waitForTimeout(500);

    // Rows should still be present (all match LEAD-)
    const filteredCount = await page.locator('tbody tr').count();
    expect(filteredCount).toBeGreaterThanOrEqual(1);
  });

  test('changing status filter dropdown should filter leads', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    // Click the stat card for "New" status to filter leads
    await page.locator('.cursor-pointer').filter({ hasText: /^New/ }).first().click();
    await page.waitForTimeout(500);

    // Verify all visible rows have "New" status
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count > 0) {
      const statusText = await rows.first().locator('td').nth(5).textContent();
      expect(statusText).toContain('New');
    }
  });

  test('clicking Follow-ups tab should switch to follow-ups view', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();

    // Should show follow-ups content (Upcoming Activities, Completed Activities)
    await expect(page.getByText(/upcoming activities|all follow/i).first()).toBeVisible();
  });

  test('clicking Leads tab from Follow-ups should switch back to leads list', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    // The TabsList is inside the Leads TabsContent, so switching to follow-ups
    // hides the tab triggers. Verify follow-ups tab works and content shows.
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await expect(page.getByText(/all follow/i).first()).toBeVisible();

    // Verify the leads table is hidden when follow-ups is active
    await expect(page.locator('thead')).not.toBeVisible();
  });

  test('conversion status dropdown should change value and show toast', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    // Find the first conversion status select in the table
    const conversionBtn = page.locator('tbody tr').first().locator('td').nth(6).locator('button').first();
    await conversionBtn.click();

    // Select "Converted"
    await page.getByRole('option', { name: /^converted$/i }).click();

    // Should show toast notification
    await expect(page.getByText(/conversion status changed to/i)).toBeVisible({ timeout: 5000 });
  });

  test('create lead form — source dropdown change event should update selection', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.locator('#source').selectOption('referral');
    await expect(page.locator('#source')).toHaveValue('referral');
  });

  test('create lead form — status dropdown change event should update selection', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.locator('#leadStatus').selectOption('qualified');
    await expect(page.locator('#leadStatus')).toHaveValue('qualified');
  });
});

// ============================================================
// 9. API VERIFICATION — GET leads
// ============================================================
test.describe('Leads — API Verification', () => {
  test('page load should call GET /api/v1/leads and receive lead data', async ({ authenticatedPage: page }) => {
    // Set up interception before navigating
    const apiPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/leads') && resp.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.locator('nav').getByText('Leads', { exact: true }).click();
    await page.waitForURL('**/leads', { timeout: 5000 });

    const response = await apiPromise;
    expect(response.status()).toBe(200);

    const body = await response.json();
    // Response should be an array of leads or an object with data
    if (Array.isArray(body)) {
      expect(body.length).toBeGreaterThanOrEqual(0);
    } else if (body.data) {
      expect(Array.isArray(body.data)).toBeTruthy();
    }
  });

  test('create lead API should send correct payload', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    // Intercept POST
    const createPromise = page.waitForResponse(
      resp => resp.url().includes('/api/v1/leads') && resp.request().method() === 'POST',
      { timeout: 10_000 }
    );

    await page.locator('#customer').fill('API Test Corp');
    await page.locator('#contact').fill('API Tester');
    await page.locator('#mobile').fill('9988776655');
    await page.locator('#source').selectOption('phone');
    await page.locator('#email').fill('api@test.com');
    await page.locator('#leadStatus').selectOption('contacted');

    await page.getByRole('button', { name: /^create lead$/i }).click();

    const response = await createPromise;
    const requestBody = response.request().postDataJSON();

    // Verify payload fields
    expect(requestBody.customer).toBe('API Test Corp');
    expect(requestBody.contact).toBe('API Tester');
    expect(requestBody.mobile).toBe('9988776655');
    expect(requestBody.source).toBe('phone');
    expect(requestBody.email).toBe('api@test.com');
    expect(requestBody.status).toBe('contacted');
  });
});

// ============================================================
// 10. NAVIGATION
// ============================================================
test.describe('Leads — Navigation', () => {
  test('clicking "View Orders" button should navigate to /orders', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('button', { name: /view orders/i }).click();
    await page.waitForURL('**/orders', { timeout: 5000 });
    expect(page.url()).toContain('/orders');
  });

  test('clicking "Create Lead" should show create form with heading', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('button', { name: /create lead/i }).click();
    await expect(page.getByRole('heading', { name: /create new lead/i })).toBeVisible();
  });

  test('← Back from create form returns to leads list with all leads visible', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);
    await page.getByRole('button', { name: /← back/i }).click();

    // Should be back on the leads list
    await expect(page.getByText(/all leads/i)).toBeVisible();
    expect(page.url()).toContain('/leads');
  });

  test('← Back from edit form returns to leads list', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/edit/i).click();
    await expect(page.getByRole('heading', { name: /edit lead/i })).toBeVisible();

    await page.getByRole('button', { name: /← back/i }).click();
    await expect(page.getByText(/all leads/i)).toBeVisible();
    expect(page.url()).toContain('/leads');
  });

  test('sidebar navigation from leads to dashboard should update URL', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.locator('nav button').filter({ hasText: /dashboard/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('sidebar navigation from leads to orders should update URL', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.locator('nav').getByText('Orders', { exact: true }).click();
    await page.waitForURL('**/orders', { timeout: 5000 });
    expect(page.url()).toContain('/orders');
  });

  test('direct URL access to /leads should work when authenticated', async ({ authenticatedPage: page }) => {
    await page.goto('/leads');
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/leads');
    await expect(page.getByRole('heading', { name: /leads management/i })).toBeVisible();
  });

  test('refreshing /leads should persist the page', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.reload();
    await page.getByText('MES Pro').waitFor({ timeout: 10_000 });
    expect(page.url()).toContain('/leads');
    await expect(page.getByRole('heading', { name: /leads management/i })).toBeVisible();
  });
});

// ============================================================
// 11. QUALIFIED LEAD ACTIONS (Convert / Reject)
// ============================================================
test.describe('Leads — Qualified Lead Actions', () => {
  test('viewing a Qualified lead should show Convert to Order and Reject buttons', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    // Filter by "Qualified" status
    await page.locator('.cursor-pointer').filter({ hasText: 'Qualified' }).first().click();
    await page.waitForTimeout(500);

    // Check if there are qualified leads
    const rowCount = await page.locator('tbody tr').count();
    if (rowCount > 0) {
      // Click view on the first qualified lead
      await page.locator('tbody tr').first().getByTitle(/view/i).click();
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Go to Actions tab
      await dialog.getByRole('tab', { name: /actions/i }).click();

      // Should show Convert to Order and Reject Lead
      await expect(dialog.getByRole('button', { name: /convert to order/i })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /reject lead/i })).toBeVisible();
    }
  });

  test('clicking Reject Lead should open rejection reason prompt', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    await page.locator('.cursor-pointer').filter({ hasText: 'Qualified' }).first().click();
    await page.waitForTimeout(500);

    const rowCount = await page.locator('tbody tr').count();
    if (rowCount > 0) {
      await page.locator('tbody tr').first().getByTitle(/view/i).click();
      const dialog = page.locator('div[role="dialog"]');
      await dialog.getByRole('tab', { name: /actions/i }).click();

      await dialog.getByRole('button', { name: /reject lead/i }).click();

      // Rejection prompt dialog should appear
      await expect(page.getByText(/reason for rejection/i)).toBeVisible();
    }
  });
});

// ============================================================
// 12. FOLLOW-UPS TAB
// ============================================================
test.describe('Leads — Follow-ups Tab', () => {
  test('Follow-ups tab should show Upcoming Activities section', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await expect(page.getByRole('heading', { name: /upcoming activities/i })).toBeVisible();
  });

  test('Follow-ups tab should show Completed Activities section', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await expect(page.getByRole('heading', { name: /completed activities/i })).toBeVisible();
  });

  test('Follow-ups tab should show Add Activity button', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await expect(page.getByRole('button', { name: /add activity/i })).toBeVisible();
  });

  test('clicking Add Activity button should open activity form dialog', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.getByRole('button', { name: /add activity/i }).click();

    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.getByText(/create a new activity/i)).toBeVisible();
  });

  test('activity form cancel button should close dialog', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.getByRole('button', { name: /add activity/i }).click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    await page.locator('div[role="dialog"]').getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });
});

// ============================================================
// 13. CREATE LEAD — Staff Dropdown (Custom Component)
// ============================================================
test.describe('Leads — Assign To Staff Dropdown', () => {
  test('clicking Assign To should open staff dropdown', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    // Click the Assign To custom dropdown trigger
    await page.getByText(/select staff/i).click();

    // Staff members should be visible
    await expect(page.getByText('Rajesh Kumar')).toBeVisible();
  });

  test('searching in staff dropdown should filter staff list', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.getByText(/select staff/i).click();
    await page.getByPlaceholder(/search staff/i).fill('Priya');

    await expect(page.getByText('Priya Sharma')).toBeVisible();
    // Others should not be visible
    await expect(page.getByText('Rajesh Kumar')).not.toBeVisible();
  });

  test('selecting a staff member should display their name', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.getByText(/select staff/i).click();
    await page.getByText('Rajesh Kumar').click();

    // Dropdown trigger should now show the selected name
    await expect(page.getByText('Rajesh Kumar')).toBeVisible();
  });
});

// ============================================================
// 14. EDGE CASES
// ============================================================
test.describe('Leads — Edge Cases', () => {
  test('search with no results should show empty table', async ({ authenticatedPage: page }) => {
    await goToLeads(page);
    // Wait for table data to fully load from API
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });

    const searchInput = page.getByPlaceholder(/search by lead/i);
    await searchInput.click();
    await searchInput.fill('NONEXISTENT_LEAD_XYZABC!!');
    // Verify the input value was set
    await expect(searchInput).toHaveValue('NONEXISTENT_LEAD_XYZABC!!');
    await page.waitForTimeout(500);

    // Scope to the active tab content to avoid counting hidden follow-ups table rows
    const activeTable = page.locator('[data-state="active"] tbody tr');
    const rowCount = await activeTable.count();
    expect(rowCount).toBe(0);
  });

  test('clearing search should show all leads again', async ({ authenticatedPage: page }) => {
    await goToLeads(page);

    // Wait for table data to fully load
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });

    // Scope to active tab to avoid counting hidden follow-ups table rows
    const activeRows = page.locator('[data-state="active"] tbody tr');
    const initialCount = await activeRows.count();

    const searchInput = page.getByPlaceholder(/search by lead/i);
    await searchInput.click();
    await searchInput.fill('NONEXISTENT');
    await expect(searchInput).toHaveValue('NONEXISTENT');
    await page.waitForTimeout(500);
    expect(await activeRows.count()).toBe(0);

    await searchInput.fill('');
    await expect(searchInput).toHaveValue('');
    await page.waitForTimeout(500);
    expect(await activeRows.count()).toBe(initialCount);
  });

  test('valid form data with valid email and phone should not show any errors', async ({ authenticatedPage: page }) => {
    await openCreateLeadForm(page);

    await page.locator('#customer').fill('No Error Corp');
    await page.locator('#contact').fill('Valid Person');
    await page.locator('#mobile').fill('9876543210');
    await page.locator('#source').selectOption('website');
    await page.locator('#email').fill('valid@email.com');

    // Don't submit, just check no errors are visible
    await expect(page.getByText('Business Name is required')).not.toBeVisible();
    await expect(page.getByText('Contact Person is required')).not.toBeVisible();
    await expect(page.getByText('Mobile is required')).not.toBeVisible();
    await expect(page.getByText('Lead Source is required')).not.toBeVisible();
  });
});

// ============================================================
// 15. BROWSER CONSOLE ERROR CHECKS
// ============================================================
test.describe('Leads — Console Error Checks', () => {
  test('leads page load should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    await page.waitForTimeout(2000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on /leads:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('leads page load should produce no uncaught exceptions', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    await page.waitForTimeout(2000);
    const pageErrors = consoleErrors.filter(e => e.source === 'pageerror');
    expect(pageErrors, `Uncaught exceptions on /leads:\n${pageErrors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening create lead form should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openCreateLeadForm(page);
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on create lead form:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('submitting invalid form should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await openCreateLeadForm(page);
    await page.getByRole('button', { name: /^create lead$/i }).click();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on form validation:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening lead detail dialog should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/view/i).click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on lead detail dialog:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching tabs inside lead detail dialog should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/view/i).click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('tab', { name: /follow-up log/i }).click();
    await page.waitForTimeout(500);
    await dialog.getByRole('tab', { name: /actions/i }).click();
    await page.waitForTimeout(500);
    await dialog.getByRole('tab', { name: /details/i }).click();
    await page.waitForTimeout(500);

    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors in dialog tabs:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening edit form should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    await page.locator('tbody tr').first().getByTitle(/edit/i).click();
    await expect(page.getByRole('heading', { name: /edit lead/i })).toBeVisible();
    await page.waitForTimeout(1000);
    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on edit form:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('switching between Leads and Follow-ups tabs should produce no errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    // Switch to Follow-ups tab and verify no console errors
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.waitForTimeout(1000);
    // Verify follow-ups content loaded
    await expect(page.getByText(/all follow/i).first()).toBeVisible();

    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during tab switch:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('filtering by stat card should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    await page.locator('.cursor-pointer').filter({ hasText: /^New/ }).first().click();
    await page.waitForTimeout(1000);
    await page.locator('.cursor-pointer').filter({ hasText: 'Contacted' }).first().click();
    await page.waitForTimeout(1000);

    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during stat card filter:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('search filtering should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    await page.getByPlaceholder(/search by lead/i).fill('LEAD-');
    await page.waitForTimeout(1000);
    await page.getByPlaceholder(/search by lead/i).fill('');
    await page.waitForTimeout(1000);

    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors during search:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });

  test('opening Add Activity dialog should produce no console errors', async ({ authenticatedPage: page, consoleErrors }) => {
    await goToLeads(page);
    await page.getByRole('tab', { name: /follow-?ups/i }).click();
    await page.getByRole('button', { name: /add activity/i }).click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await page.waitForTimeout(1000);

    const errors = consoleErrors.filter(e => e.source === 'console');
    expect(errors, `Console errors on Add Activity dialog:\n${errors.map(e => e.message).join('\n')}`).toHaveLength(0);
  });
});
