import { test as base, Page } from '@playwright/test';

/**
 * Shared fixtures for MES Pro tests.
 * - `authenticatedPage`: a Page that is already authenticated (via global setup
 *   storageState) and has navigated to /dashboard.
 * - `consoleErrors`: array of browser console errors collected during the test.
 *
 * Authentication uses the pre-saved storageState from global-setup.ts — no
 * per-test login API call is needed, which avoids 429 rate-limiting issues.
 */

/** A single captured browser console error or uncaught page error. */
export interface ConsoleError {
  /** 'console' for console.error(), 'pageerror' for uncaught exceptions */
  source: 'console' | 'pageerror';
  /** The error message text */
  message: string;
  /** URL where the error occurred, when available */
  url?: string;
}

type Fixtures = {
  authenticatedPage: Page;
  /** Browser console errors captured during the test (populated automatically). */
  consoleErrors: ConsoleError[];
};

/** Errors matching any of these patterns are ignored (e.g. rate-limit noise). */
const IGNORED_ERROR_PATTERNS = [
  /429/,
  /too many requests/i,
  /rate.?limit/i,
];

function isIgnoredError(message: string): boolean {
  return IGNORED_ERROR_PATTERNS.some((re) => re.test(message));
}

export const test = base.extend<Fixtures>({
  // Shared console error collector — wired to the page before every test
  consoleErrors: async ({ page }, use) => {
    const errors: ConsoleError[] = [];

    // Capture console.error() calls
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnoredError(msg.text())) {
        errors.push({
          source: 'console',
          message: msg.text(),
          url: page.url(),
        });
      }
    });

    // Capture uncaught exceptions / unhandled promise rejections
    page.on('pageerror', (err) => {
      if (!isIgnoredError(err.message)) {
        errors.push({
          source: 'pageerror',
          message: err.message,
          url: page.url(),
        });
      }
    });

    await use(errors);
  },

  authenticatedPage: async ({ page, consoleErrors: _ce }, use) => {
    // Storage state (with auth token in localStorage) is already loaded via
    // playwright.config.ts → projects[].use.storageState.
    // Navigate to /dashboard with retry logic in case of transient failures.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
        await page.getByText('MES Pro').waitFor({ timeout: 15_000 });
        await page.waitForURL('**/dashboard', { timeout: 10_000 });
        break; // success
      } catch {
        if (attempt === 3) throw new Error('authenticatedPage: failed to load dashboard after 3 attempts');
        // Wait before retrying — helps if rate limit or transient backend issue
        await page.waitForTimeout(3_000 * attempt);
      }
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
