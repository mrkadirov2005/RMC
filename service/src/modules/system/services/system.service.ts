const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const pool = require('../../../db/pool');

const RESET_CONFIRMATION = 'TRUNCATE_EDUCATION_DATA';
const RESET_TABLES = {
  students: 'students',
  teachers: 'teachers',
  classes: 'classes',
};

const getRedeployScriptPath = () =>
  process.env.SERVER_REDEPLOY_SCRIPT ||
  path.resolve(process.cwd(), '..', 'scripts', 'redeploy.sh');

const passwordsMatch = (actual: string, expected: string) => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const validateRedeployPassword = (password: string) => {
  const expectedPassword = String(process.env.SERVER_REDEPLOY_PASSWORD || '');
  if (!expectedPassword) {
    const error: any = new Error('Server redeploy password is not configured.');
    error.statusCode = 503;
    throw error;
  }
  if (!passwordsMatch(String(password || ''), expectedPassword)) {
    const error: any = new Error('Invalid redeploy password.');
    error.statusCode = 403;
    throw error;
  }
};

const scheduleRedeploy = () => {
  const scriptPath = getRedeployScriptPath();
  setTimeout(() => {
    const child = spawn('sh', [scriptPath], {
      cwd: path.resolve(scriptPath, '..', '..'),
      detached: true,
      stdio: 'ignore',
      env: process.env,
    });
    child.unref();
  }, 500);
};

const validateDevResetRequest = (confirmation: string) => {
  if (process.env.NODE_ENV === 'production') {
    const error: any = new Error('Dev reset endpoint is disabled in production.');
    error.statusCode = 403;
    throw error;
  }

  if (String(confirmation || '') !== RESET_CONFIRMATION) {
    const error: any = new Error(`Invalid confirmation. Send confirmation: ${RESET_CONFIRMATION}`);
    error.statusCode = 400;
    throw error;
  }
};

type ResetTableKey = keyof typeof RESET_TABLES;

const resetTable = async (tableKey: ResetTableKey) => {
  const tableName = RESET_TABLES[tableKey];
  const beforeResult = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);

  await pool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);

  const beforeCount = beforeResult.rows[0]?.count ?? 0;
  return {
    truncated: tableName,
    cascade: true,
    before: beforeCount,
    after: 0,
  };
};

module.exports = {
  validateRedeployPassword,
  scheduleRedeploy,
  validateDevResetRequest,
  resetTable,
  RESET_CONFIRMATION,
};

export {};
