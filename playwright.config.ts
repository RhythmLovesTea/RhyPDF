import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/spikes.spec.ts',
  timeout: 60000,
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: true
  },
  use: {
    baseURL: 'http://localhost:5173'
  },
  projects: [
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge'
      }
    }
  ]
});
