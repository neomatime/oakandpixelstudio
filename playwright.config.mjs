import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'node scripts/static-server.mjs',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
