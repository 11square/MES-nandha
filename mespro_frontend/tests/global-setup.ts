/**
 * Global setup: Log in once and save the browser storage state (localStorage
 * with the auth token) so every test can reuse it without hitting the login API.
 *
 * Playwright runs this file ONCE before the test suite starts.
 */
import { chromium, type FullConfig } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@mespro.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

/** Path where the authenticated storage state is persisted. */
export const STORAGE_STATE_PATH = 'tests/.auth/storageState.json';

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Retry login up to 3 times in case of 429 rate limits
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      await page.getByPlaceholder('Enter your email').fill(TEST_EMAIL);
      await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.getByText('MES Pro').waitFor({ timeout: 30_000 });
      await page.waitForURL('**/dashboard', { timeout: 15_000 });
      break; // success
    } catch {
      if (attempt === 3) throw new Error('Global setup: login failed after 3 attempts');
      await page.waitForTimeout(5_000 * attempt);
    }
  }

  // Persist browser storage (localStorage with auth token, cookies, etc.)
  await context.storageState({ path: STORAGE_STATE_PATH });

  await browser.close();
}

export default globalSetup;
