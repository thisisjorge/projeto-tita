import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: 'list',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
  },
  webServer: {
    command: 'node scripts/test-server.mjs',
    url: 'http://127.0.0.1:4173/app',
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
