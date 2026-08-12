import { defineConfig, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

let launchOptions: { executablePath?: string; args?: string[] } = {};
if (process.env.PLAYWRIGHT_SERVERLESS === '1') {
  const { default: serverlessChromium } = await import('@sparticuz/chromium');
  const browserTemp = resolve('.playwright-tmp');
  mkdirSync(browserTemp, { recursive: true });
  process.env.TMPDIR = browserTemp;
  process.env.TMP = browserTemp;
  process.env.TEMP = browserTemp;
  serverlessChromium.setGraphicsMode = process.env.PLAYWRIGHT_WEBGL === '1';
  // Managed workspaces reject chown even for uid 0. Make tar-fs extract as the current
  // user; the browser files remain private to this temporary test directory.
  const realGetuid = process.getuid;
  Object.defineProperty(process, 'getuid', { configurable: true, value: () => 1_000 });
  const executablePath = await serverlessChromium.executablePath();
  Object.defineProperty(process, 'getuid', { configurable: true, value: realGetuid });
  launchOptions = { executablePath, args: serverlessChromium.args };
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/?demo=1',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
