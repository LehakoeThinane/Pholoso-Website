// Browser tests for the static site. Starts local PHP servers:
//   8090  the site, wired to a mock of Microsoft's endpoints (forms succeed)
//   8092  the site with no Microsoft 365 config (forms must fail honestly)
//   8091  the mock itself
// PHP_BIN picks the PHP executable (default "php"). BROWSER_CHANNEL=msedge or chrome
// uses an installed browser instead of Playwright's bundled Chromium.
const { defineConfig } = require('@playwright/test');
const os = require('os');
const path = require('path');

const php = process.env.PHP_BIN || 'php';
const tmp = path.join(os.tmpdir(), 'pholoso-e2e');
process.env.E2E_TMP = tmp;
process.env.MOCK_GRAPH_LOG = path.join(tmp, 'graph-requests.log');

module.exports = defineConfig({
  testDir: 'tests/e2e',
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8090',
    channel: process.env.BROWSER_CHANNEL || undefined,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `"${php}" -S 127.0.0.1:8091 tests/php/mock-graph.php`,
      url: 'http://127.0.0.1:8091/healthz',
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'ignore',
      env: { MOCK_GRAPH_LOG: process.env.MOCK_GRAPH_LOG },
    },
    {
      command: `"${php}" -S 127.0.0.1:8090 -t .`,
      url: 'http://127.0.0.1:8090/index.html',
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'ignore',
      env: { PHOLOSO_CONFIG: path.resolve('tests/e2e/e2e-config.php'), E2E_TMP: tmp },
    },
    {
      command: `"${php}" -S 127.0.0.1:8092 -t .`,
      url: 'http://127.0.0.1:8092/index.html',
      reuseExistingServer: false,
      stdout: 'ignore',
      stderr: 'ignore',
      env: { PHOLOSO_CONFIG: path.join(tmp, 'missing-config.php') },
    },
  ],
});
