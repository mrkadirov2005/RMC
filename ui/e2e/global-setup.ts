import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';

export default async function globalSetup(_config: FullConfig) {
  const database = process.env.E2E_DB_NAME || 'crm_frontend_e2e_test';
  const databaseHost = process.env.E2E_DB_HOST || '127.0.0.1';
  if (!/^crm_[a-z0-9_]*e2e_test$/i.test(database)) {
    throw new Error(`Refusing to reset a database that is not E2E-only: ${database}`);
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(databaseHost.toLowerCase())) {
    throw new Error(`Refusing to run local E2E tests against remote database host: ${databaseHost}`);
  }

  const seedScript = path.resolve(process.cwd(), '../service/test/e2e/seed.js');
  execFileSync(process.execPath, [seedScript], {
    cwd: path.resolve(process.cwd(), '../service'),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TEST_DB_HOST: databaseHost,
      TEST_DB_PORT: process.env.E2E_DB_PORT || '5432',
      TEST_DB_USER: process.env.E2E_DB_USER || 'crm_user',
      TEST_DB_PASSWORD: process.env.E2E_DB_PASSWORD || 'crm_password',
      TEST_DB_NAME: database,
      DB_HOST: databaseHost,
      DB_PORT: process.env.E2E_DB_PORT || '5432',
      DB_USER: process.env.E2E_DB_USER || 'crm_user',
      DB_PASSWORD: process.env.E2E_DB_PASSWORD || 'crm_password',
      DB_NAME: database,
    },
  });
}
