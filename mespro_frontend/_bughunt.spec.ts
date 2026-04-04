import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PageResult {
  page: string;
  url: string;
  formOpened: boolean;
  isBlank: boolean;
  consoleErrors: string[];
  consoleWarnings: string[];
  networkFailures: string[];
  buttonFound: boolean;
  buttonText: string;
  notes: string;
}

async function run() {
  const results: PageResult[] = [];
  const screenshotDir = path.resolve(__dirname, '../../bug-report/screenshots');
  const reportDir = path.resolve(__dirname, '../../bug-report');
  fs.mkdirSync(screenshotDir, { recursive: true });
  
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let currentErrors: string[] = [];
  let currentWarnings: string[] = [];
  let currentNetworkFailures: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      currentErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      currentWarnings.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    currentErrors.push(`PAGE_ERROR: ${err.message}\n${err.stack || ''}`);
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      currentNetworkFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  function resetTracking() {
    currentErrors = [];
    currentWarnings = [];
    currentNetworkFailures = [];
  }

  // ===================== LOGIN =====================
  console.log('=== LOGGING IN ===');
  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);

    await page.locator('input[type="email"]').fill('admin@mespro.com');
    await page.locator('input[type="password"]').fill('admin@123');
    await page.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log(`After login, URL: ${page.url()}`);
    
    if (page.url().includes('/login')) {
      console.log('WARNING: Still on login page - login may have failed');
      await page.screenshot({ path: path.join(screenshotDir, 'login-failed.png') });
    } else {
      console.log('Login successful!');
      await page.screenshot({ path: path.join(screenshotDir, 'login-success.png') });
    }
  } catch (e: any) {
    console.log(`Login error: ${e.message}`);
    await page.screenshot({ path: path.join(screenshotDir, 'login-error.png') });
  }

  // ===================== TEST PAGES =====================
  const pagesToTest = [
    {
      name: 'Leads',
      url: 'http://localhost:5173/leads',
      buttonPatterns: ['Create Lead', 'Add Lead', 'New Lead', 'Create', 'Add New', 'Add', 'New'],
    },
    {
      name: 'Orders',
      url: 'http://localhost:5173/orders',
      buttonPatterns: ['Create Order', 'Add Order', 'New Order', 'Create', 'Add New', 'Add', 'New'],
    },
    {
      name: 'Billing',
      url: 'http://localhost:5173/billing',
      buttonPatterns: ['Create Bill', 'Add Bill', 'New Bill', 'Create Invoice', 'Create', 'Add New', 'Add', 'New'],
    },
    {
      name: 'Purchase Orders',
      url: 'http://localhost:5173/purchase-orders',
      buttonPatterns: ['Create PO', 'Create Purchase Order', 'Add PO', 'New PO', 'Create', 'Add New', 'Add', 'New'],
    },
  ];

  for (const testPage of pagesToTest) {
    console.log(`\n=== TESTING: ${testPage.name} ===`);
    resetTracking();

    const result: PageResult = {
      page: testPage.name,
      url: testPage.url,
      formOpened: false,
      isBlank: false,
      consoleErrors: [],
      consoleWarnings: [],
      networkFailures: [],
      buttonFound: false,
      buttonText: '',
      notes: '',
    };

    try {
      await page.goto(testPage.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);

      result.consoleErrors.push(...currentErrors);
      result.consoleWarnings.push(...currentWarnings);
      result.networkFailures.push(...currentNetworkFailures);
      
      console.log(`  Page loaded. Load errors: ${currentErrors.length}`);
      console.log(`  Current URL: ${page.url()}`);

      if (page.url().includes('/login')) {
        result.notes = 'Redirected to login - not authenticated';
        results.push(result);
        continue;
      }

      await page.screenshot({ path: path.join(screenshotDir, `${testPage.name.toLowerCase().replace(/\s+/g, '-')}-list.png`) });

      // Print all visible buttons for debugging
      const allButtons = await page.locator('button').allTextContents();
      console.log(`  All buttons: ${JSON.stringify(allButtons.map(b => b.trim()).filter(Boolean))}`);

      // Try finding and clicking the create/add button
      resetTracking();
      let buttonClicked = false;

      for (const pattern of testPage.buttonPatterns) {
        try {
          const btn = page.locator(`button:has-text("${pattern}")`).first();
          if (await btn.isVisible({ timeout: 500 })) {
            result.buttonFound = true;
            result.buttonText = (await btn.textContent() || pattern).trim();
            console.log(`  Clicking button: "${result.buttonText}"`);
            await btn.click();
            buttonClicked = true;
            break;
          }
        } catch {}
      }

      if (!buttonClicked) {
        for (const pattern of testPage.buttonPatterns) {
          try {
            const link = page.locator(`a:has-text("${pattern}")`).first();
            if (await link.isVisible({ timeout: 500 })) {
              result.buttonFound = true;
              result.buttonText = (await link.textContent() || pattern).trim();
              console.log(`  Clicking link: "${result.buttonText}"`);
              await link.click();
              buttonClicked = true;
              break;
            }
          } catch {}
        }
      }

      if (!buttonClicked) {
        result.notes = 'Could not find Create/Add button on page';
        console.log(`  No create/add button found for ${testPage.name}`);
      }

      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle').catch(() => {});

      result.consoleErrors.push(...currentErrors);
      result.consoleWarnings.push(...currentWarnings);
      result.networkFailures.push(...currentNetworkFailures);

      await page.screenshot({ path: path.join(screenshotDir, `${testPage.name.toLowerCase().replace(/\s+/g, '-')}-form.png`) });

      const currentUrl = page.url();
      console.log(`  URL after click: ${currentUrl}`);

      const dialogVisible = await page.locator('[role="dialog"], .modal, .drawer, [data-state="open"], .fixed.inset-0').first().isVisible({ timeout: 1000 }).catch(() => false);
      const formVisible = await page.locator('form').first().isVisible({ timeout: 1000 }).catch(() => false);
      const inputsVisible = await page.locator('input:not([type="search"]):not([type="hidden"]), textarea, select').first().isVisible({ timeout: 1000 }).catch(() => false);
      
      result.formOpened = dialogVisible || (buttonClicked && (formVisible || inputsVisible));

      const mainContent = await page.evaluate(() => {
        const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('#root');
        return main ? main.innerText.trim() : '';
      });
      
      const contentLength = mainContent.length;
      
      if (buttonClicked && !dialogVisible && contentLength < 100 && !formVisible) {
        result.isBlank = true;
      }
      if (buttonClicked && currentErrors.some(e => e.includes('PAGE_ERROR') || e.includes('Cannot read') || e.includes('is not defined') || e.includes('is undefined'))) {
        result.isBlank = true;
      }

      console.log(`  Dialog visible: ${dialogVisible}`);
      console.log(`  Form visible: ${formVisible}`);
      console.log(`  Inputs visible: ${inputsVisible}`);
      console.log(`  Content length: ${contentLength}`);
      console.log(`  Console errors (${result.consoleErrors.length}):`);
      result.consoleErrors.forEach((e, i) => console.log(`    [${i}] ${e.substring(0, 500)}`));
      console.log(`  Network failures (${result.networkFailures.length}):`);
      result.networkFailures.forEach((e, i) => console.log(`    [${i}] ${e}`));

    } catch (e: any) {
      result.notes += ` Exception: ${e.message}`;
      console.log(`  Exception: ${e.message}`);
    }

    results.push(result);
  }

  // ===================== FINAL REPORT =====================
  console.log('\n\n========== FINAL REPORT ==========\n');
  
  for (const r of results) {
    const status = r.isBlank ? 'BLANK' : (r.formOpened ? 'WORKING' : 'UNKNOWN');
    console.log(`[${status}] ${r.page} (${r.url})`);
    console.log(`  Button: ${r.buttonFound ? `"${r.buttonText}"` : 'NOT FOUND'}`);
    console.log(`  Console errors: ${r.consoleErrors.length}`);
    if (r.consoleErrors.length > 0) {
      r.consoleErrors.forEach((e, i) => console.log(`    ERROR[${i}]: ${e.substring(0, 500)}`));
    }
    if (r.networkFailures.length > 0) {
      console.log(`  Network failures:`);
      r.networkFailures.forEach((e, i) => console.log(`    NET[${i}]: ${e}`));
    }
    if (r.notes) console.log(`  Notes: ${r.notes}`);
    console.log('');
  }

  const report = {
    url: 'http://localhost:5173',
    scanDate: new Date().toISOString(),
    summary: {
      pagesChecked: results.length,
      blankForms: results.filter(r => r.isBlank).length,
      workingForms: results.filter(r => r.formOpened && !r.isBlank).length,
      totalConsoleErrors: results.reduce((sum, r) => sum + r.consoleErrors.length, 0),
      totalNetworkFailures: results.reduce((sum, r) => sum + r.networkFailures.length, 0),
    },
    results,
  };

  fs.writeFileSync(path.join(reportDir, 'form-test-report.json'), JSON.stringify(report, null, 2));
  console.log('\nReport written to bug-report/form-test-report.json');

  await page.waitForTimeout(2000);
  await browser.close();
}

run().catch(console.error);
