import { test, expect } from '../fixtures';

test.describe('Finance — Descending Order', () => {

  test('transactions should be listed in descending date order (newest first)', async ({ authenticatedPage: page }) => {
    await page.locator('nav').getByText('Finance', { exact: true }).click();
    await page.waitForURL('**/finance', { timeout: 10_000 });

    const resp = await page.waitForResponse(
      r => r.url().includes('/finance/transactions/all') && r.request().method() === 'GET',
      { timeout: 15_000 },
    );
    expect(resp.status()).toBe(200);

    const body = await resp.json();
    const items: any[] = body.data?.items || [];
    expect(items.length).toBeGreaterThan(0);
    console.log(`  Total finance items: ${items.length}`);

    // Verify API data is in descending date order
    for (let i = 1; i < items.length; i++) {
      const prevDate = new Date(items[i - 1].date || 0).getTime();
      const currDate = new Date(items[i].date || 0).getTime();
      expect(prevDate).toBeGreaterThanOrEqual(currDate);
      if (prevDate === currDate && items[i - 1]._source === items[i]._source) {
        expect(items[i - 1]._sourceId).toBeGreaterThanOrEqual(items[i]._sourceId);
      }
    }
    console.log('  ✓ API items are in descending order');

    // Verify UI table dates are in descending order
    await page.locator('tbody tr').first().waitFor({ timeout: 10_000 });
    const dateTexts = await page.locator('tbody tr td:first-child').allTextContents();
    const dates = dateTexts
      .map(t => t.trim())
      .filter(t => /\d{1,2}\/\d{1,2}\/\d{4}/.test(t))
      .map(t => {
        const [m, d, y] = t.split('/').map(Number);
        return new Date(y, m - 1, d).getTime();
      });

    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
    console.log(`  ✓ UI transaction dates are in descending order (${dates.length} rows)`);
  });

  test('receipts should be listed in descending order (newest first)', async ({ authenticatedPage: page }) => {
    await page.locator('nav').getByText('Finance', { exact: true }).click();
    await page.waitForURL('**/finance', { timeout: 10_000 });
    await page.waitForTimeout(1500);

    // Click the Receipts tab
    await page.getByRole('tab', { name: /receipts/i }).click();
    await page.waitForTimeout(1000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`  Total receipt rows: ${rowCount}`);

    if (rowCount <= 1) {
      console.log('  Skipping — not enough receipts');
      return;
    }

    // Extract dates from the date column (3rd column) and IDs from 1st column
    const dateCells = await rows.locator('td:nth-child(3)').allTextContents();
    const idCells = await rows.locator('td:first-child').allTextContents();
    const ids = idCells.map(t => parseInt(t.trim(), 10)).filter(n => !isNaN(n));
    const dates = dateCells
      .map(t => t.trim())
      .filter(t => /\d{1,2}\/\d{1,2}\/\d{4}/.test(t))
      .map(t => {
        const [m, d, y] = t.split('/').map(Number);
        return new Date(y, m - 1, d).getTime();
      });

    // Dates should be descending
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
    console.log(`  ✓ Receipts dates are in descending order (${dates.length} rows)`);

    // Same-date receipts should have descending IDs
    for (let i = 1; i < ids.length && i < dates.length; i++) {
      if (dates[i - 1] === dates[i]) {
        expect(ids[i - 1]).toBeGreaterThan(ids[i]);
      }
    }
    console.log(`  ✓ Same-date receipts are in descending ID order`);
  });
});

test.describe('Orders — Descending Order', () => {

  test('orders should be listed in descending date order (newest first)', async ({ authenticatedPage: page }) => {
    await page.locator('nav').getByText('Orders', { exact: true }).click();
    await page.waitForURL('**/orders', { timeout: 10_000 });
    await page.waitForTimeout(2000);

    // Verify UI — dates in 2nd column should be descending
    const dateCells = await page.locator('tbody tr td:nth-child(2)').allTextContents();
    const dates = dateCells
      .map(t => t.trim())
      .filter(t => /\d{1,2}\/\d{1,2}\/\d{4}/.test(t))
      .map(t => {
        const [m, d, y] = t.split('/').map(Number);
        return new Date(y, m - 1, d).getTime();
      });

    console.log(`  Total order rows: ${dates.length}`);
    expect(dates.length).toBeGreaterThan(0);

    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
    console.log(`  ✓ UI orders are in descending date order (${dates.length} rows)`);
  });
});
