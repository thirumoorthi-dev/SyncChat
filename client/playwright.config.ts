import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,

  // Auto-start the Vite dev server before tests run
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true, // reuse if already running
    timeout: 30_000,
  },

  use: {
    baseURL: 'http://localhost:5173',
    // headless: false → real visible browser window
    headless: false,
    // Slow down each action by 600ms so you can watch it happen
    launchOptions: {
      slowMo: 600,
    },
    // Record a video of every test run
    video: 'on',
    screenshot: 'on',
    trace: 'on',
    // Mobile viewport to test responsive bugs
    viewport: { width: 390, height: 844 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 5'] }, // Mobile device profile
    },
  ],

  // Reporter: shows results in terminal + opens HTML report
  reporter: [['list'], ['html', { open: 'always' }]],
});
