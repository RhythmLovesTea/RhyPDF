import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: [
    '**/editor-shell.spec.ts',
    '**/styleguide.spec.ts',
    '**/routing.spec.ts',
    '**/error-handling.spec.ts',
    '**/i18n.spec.ts',
    '**/security-pwa.spec.ts',
    '**/main-flows.spec.ts',
    '**/accessibility.spec.ts'
  ],
  timeout: 60000,
  workers: 1,
  webServer: {
    command: 'node scripts/serve_preview.mjs',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'msedge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge'
      }
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox']
      }
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari']
      }
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        channel: 'msedge'
      }
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12']
      }
    }
  ]
});
