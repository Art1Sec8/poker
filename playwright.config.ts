import { defineConfig, devices } from '@playwright/test';

// Run against a deployed URL with PLAYWRIGHT_BASE_URL=https://... npm run test:e2e
// Otherwise a local production server is built and started on port 3100.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const port = 3100;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: externalBaseURL ?? `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run build && PORT=${port} npm start`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
      },
});
