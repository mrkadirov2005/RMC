import { defineConfig, devices } from '@playwright/test';

const backendPort = Number(process.env.E2E_BACKEND_PORT || 4100);
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5174);
const database = process.env.E2E_DB_NAME || 'crm_frontend_e2e_test';
const databaseHost = process.env.E2E_DB_HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(databaseHost.toLowerCase())) {
  throw new Error(`Local Playwright tests cannot use remote database host: ${databaseHost}`);
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  outputDir: './test-results/e2e-artifacts',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['junit', { outputFile: 'test-results/e2e.xml' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    channel: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../service',
      url: `http://127.0.0.1:${backendPort}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(backendPort),
        DB_HOST: databaseHost,
        DB_PORT: process.env.E2E_DB_PORT || '5432',
        DB_USER: process.env.E2E_DB_USER || 'crm_user',
        DB_PASSWORD: process.env.E2E_DB_PASSWORD || 'crm_password',
        DB_NAME: database,
        AUTO_CREATE_DB: 'false',
        AUTO_MIGRATE: 'false',
        JWT_SECRET: process.env.E2E_JWT_SECRET || 'crm-frontend-e2e-secret',
        MONGO_URI: '',
      },
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      cwd: '.',
      url: `http://127.0.0.1:${frontendPort}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_BASE_URL: `http://127.0.0.1:${backendPort}/api`,
      },
    },
  ],
  projects: [
    { name: 'chromium', testIgnore: /.*\.mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
});
