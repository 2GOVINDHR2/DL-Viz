import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Build containers ship Chromium at a fixed path; elsewhere Playwright's own browsers are used.
const CONTAINER_CHROMIUM = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'];
const chromiumPath =
  process.env.PW_CHROMIUM ?? (process.env.CI ? undefined : CONTAINER_CHROMIUM.find((p) => existsSync(p)));

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:4173', viewport: { width: 1280, height: 720 } },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: { executablePath: chromiumPath },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } } },
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1280, height: 720 } },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  reporter: [['list']],
});
