export {};

require('dotenv/config');

const { Client } = require('pg');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = (process.env[name] || '').trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

async function ensureDatabaseExists(): Promise<void> {
  if (!envFlag('AUTO_CREATE_DB', true)) return;

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 5432);

  const targetDb = process.env.DB_NAME || 'crm_db';
  const targetUser = process.env.DB_USER || 'crm_user';
  const targetPassword = process.env.DB_PASSWORD || 'crm_password';

  const adminDb = process.env.DB_ADMIN_DB || 'postgres';
  const adminUser = process.env.DB_ADMIN_USER || targetUser;
  const adminPassword = process.env.DB_ADMIN_PASSWORD || targetPassword;

  const client = new Client({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    database: adminDb,
  });

  try {
    await client.connect();

    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (exists.rowCount && exists.rowCount > 0) return;

    const escapedDbName = '"' + String(targetDb).replace(/"/g, '""') + '"';
    const escapedOwner = '"' + String(targetUser).replace(/"/g, '""') + '"';
    // If the target role exists, make it the owner. If it doesn't, Postgres will error;
    // in that case, create without OWNER and let the admin role own it.
    try {
      await client.query(`CREATE DATABASE ${escapedDbName} OWNER ${escapedOwner}`);
    } catch (err: any) {
      await client.query(`CREATE DATABASE ${escapedDbName}`);
    }
    console.log(`[db] created database ${targetDb}`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function runMigrations(): Promise<void> {
  if (!envFlag('AUTO_MIGRATE', true)) return;

  console.log('[db] running migrations (sequelize-cli db:migrate)...');
  const cwd = path.resolve(__dirname, '..', '..'); // service/src/db -> service/
  // Use a shell so this works consistently on Windows (.cmd) and *nix.
  await execAsync('npx --no-install sequelize-cli db:migrate', {
    cwd,
    env: process.env,
    windowsHide: true,
    shell: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  console.log('[db] migrations complete');
}

async function ensureDatabaseAndMigrate(): Promise<void> {
  await ensureDatabaseExists();
  await runMigrations();
}

module.exports = { ensureDatabaseAndMigrate };
