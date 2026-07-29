const { spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const pool = require('../../../db/pool');
const { sql } = require('drizzle-orm');
const v8 = require('v8');

const db = pool.db;

const RESET_CONFIRMATION = 'TRUNCATE_EDUCATION_DATA';
const RESET_TABLES = {
  students: 'students',
  teachers: 'teachers',
  classes: 'classes',
  payments: 'payments',
};

const envFlag = (name: string, defaultValue: boolean) => {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
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
  const enabledByDefault = process.env.NODE_ENV !== 'production';
  if (!envFlag('OWNER_DATA_RESET_ENABLED', enabledByDefault)) {
    const error: any = new Error('Owner data reset endpoint is disabled.');
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
  const beforeRows = await db.execute(sql.raw(`SELECT COUNT(*)::int AS count FROM ${tableName}`));

  await db.execute(sql.raw(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`));

  const beforeCount = beforeRows.rows?.[0]?.count ?? 0;
  return {
    truncated: tableName,
    cascade: true,
    before: beforeCount,
    after: 0,
  };
};

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const getStats = async () => {
  const memory = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const cpus = os.cpus() || [];
  const loadAverage = os.loadavg();
  const oneMinuteLoad = Number(loadAverage[0] || 0);
  const cpuCount = Math.max(cpus.length, 1);
  const cpuLoadPercent = Math.min(100, round((oneMinuteLoad / cpuCount) * 100, 1));

  let database = { status: 'unknown', latencyMs: null as number | null };
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    database = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch {
    database = { status: 'unhealthy', latencyMs: null };
  }

  return {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: {
      name: 'CRM Backend Server',
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      nodeVersion: process.version,
      uptimeSeconds: round(process.uptime(), 0),
    },
    host: {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptimeSeconds: round(os.uptime(), 0),
    },
    cpu: {
      cores: cpuCount,
      model: cpus[0]?.model || 'Unknown CPU',
      loadAverage,
      loadPercent: cpuLoadPercent,
    },
    memory: {
      totalBytes: totalMemory,
      freeBytes: freeMemory,
      usedBytes: usedMemory,
      usedPercent: round((usedMemory / Math.max(totalMemory, 1)) * 100, 1),
      process: {
        rssBytes: memory.rss,
        heapTotalBytes: memory.heapTotal,
        heapUsedBytes: memory.heapUsed,
        heapLimitBytes: heapStats.heap_size_limit,
        externalBytes: memory.external,
        arrayBuffersBytes: memory.arrayBuffers,
      },
    },
    database,
  };
};

module.exports = {
  validateRedeployPassword,
  scheduleRedeploy,
  validateDevResetRequest,
  resetTable,
  getStats,
  RESET_CONFIRMATION,
};

export {};
