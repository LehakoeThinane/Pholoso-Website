/**
 * Browser tests (brief §17). They run against the built site in dist/, served by
 * `astro preview`, at a phone size and a desktop size.
 *
 *   pnpm build:preview && pnpm test:e2e
 *
 * Locally, if Playwright's own Chromium is not installed, use an installed browser:
 *   PW_CHANNEL=msedge pnpm test:e2e      (or chrome)
 */
import { defineConfig, devices } from '@playwright/test';

// Not 4321: that is `astro dev`, which may already be running with different content.
const PORT = 4399;
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
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
    command: `node node_modules/astro/bin/astro.mjs preview --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
