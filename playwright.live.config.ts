/**
 * Browser tests for the Parent Coach in live mode: the real built pages, the PHP API, a
 * throwaway database and a mock of the AI provider (never the real API).
 *
 *   pnpm build:live && pnpm test:e2e:live
 *
 * Needs PHP 7.4+ with pdo_sqlite and curl on the PATH (PHP_BIN to choose another).
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4398;
const channel = process.env.PW_CHANNEL;
const php = process.env.PHP_BIN || 'php';

export default defineConfig({
  testDir: 'tests/e2e-live',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    ...(channel ? { channel } : {}),
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `"${php}" tests/php/live-server.php dist-live ${PORT}`,
    url: `http://127.0.0.1:${PORT}/parent-coach/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
