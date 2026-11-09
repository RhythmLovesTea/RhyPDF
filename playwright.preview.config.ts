import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/editor-shell.spec.ts', '**/styleguide.spec.ts'],
  timeout: 60000,
  webServer: {
    command: 'pnpm --filter @rhypdf/editor preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'msedge',
    trace: 'on-first-retry'
  }
});
