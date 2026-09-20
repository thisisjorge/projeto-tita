import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

// Automated engine coverage; not a claim of Safari/macOS or iPhone device QA.
export default defineConfig({
  ...base,
  use: { ...base.use, channel: undefined, browserName: 'webkit' },
  projects: [{ name: 'webkit', use: { browserName: 'webkit', channel: undefined } }],
});
