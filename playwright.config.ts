import { defineConfig, devices } from '@playwright/test';
const port = process.env.TITA_TEST_PORT ?? '4173';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: 'list',
  workers: 1,
  use: {
    baseURL: process.env.TITA_BASE_URL ?? `http://127.0.0.1:${port}`,
    channel: 'chrome',
  },
  webServer: process.env.TITA_BASE_URL
    ? undefined
    : {
        command: 'node scripts/test-server.mjs',
        env: { PORT: port },
        url: `http://127.0.0.1:${port}/app`,
        reuseExistingServer: true,
        timeout: 10000,
      },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
