const { spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const pool = require('../../../db/pool');
const { sql } = require('drizzle-orm');
const v8 = require('v8');

const db = pool.db;
const SENSITIVE_COLUMN = /(password|secret|token|credential|private_key|api_key|hash)/i;

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

const safeOsValue = <T>(read: () => T, fallback: T): T => {
  try { return read(); }
  catch { return fallback; }
};

const getStats = async () => {
  const memory = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const cpus = safeOsValue(() => os.cpus(), []) || [];
  const loadAverage = safeOsValue(() => os.loadavg(), [0, 0, 0]);
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
      hostname: safeOsValue(() => os.hostname(), 'unknown'),
      platform: safeOsValue(() => os.platform(), 'unknown'),
      release: safeOsValue(() => os.release(), 'unknown'),
      arch: safeOsValue(() => os.arch(), 'unknown'),
      uptimeSeconds: round(safeOsValue(() => os.uptime(), 0), 0),
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

const getDatabaseTables = async () => {
  const result = await pool.query(`
    SELECT t.table_name,
      COALESCE(s.n_live_tup, 0)::int AS estimated_rows,
      COUNT(c.column_name)::int AS column_count
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = t.table_schema
    LEFT JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name, s.n_live_tup
    ORDER BY t.table_name
  `);
  return result.rows;
};

const assertPublicTable = async (tableName: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    const error: any = new Error('Invalid table name.'); error.statusCode = 400; throw error;
  }
  const result = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = $1`,
    [tableName]
  );
  if (!result.rowCount) {
    const error: any = new Error('Table not found.'); error.statusCode = 404; throw error;
  }
};

const getStudioTableMetadata = async (tableName: string) => {
  await assertPublicTable(tableName);
  const [columnsResult, keysResult] = await Promise.all([
    pool.query(`SELECT column_name, data_type, is_nullable, column_default, is_identity, is_generated
      FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [tableName]),
    pool.query(`SELECT kcu.column_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name AND kcu.table_schema=tc.table_schema
      WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='PRIMARY KEY' ORDER BY kcu.ordinal_position`, [tableName]),
  ]);
  const primaryKey = keysResult.rows.map((row: any) => row.column_name);
  const editableColumns = columnsResult.rows.filter((column: any) =>
    !SENSITIVE_COLUMN.test(column.column_name) && column.is_identity !== 'YES' && column.is_generated === 'NEVER'
  ).map((column: any) => column.column_name);
  return { columns: columnsResult.rows, primaryKey, editableColumns, editable: primaryKey.length > 0 };
};

const assertColumnValues = (values: any, allowed: string[]) => {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw Object.assign(new Error('values must be an object.'), { statusCode: 400 });
  const entries = Object.entries(values).filter(([column]) => allowed.includes(column));
  if (!entries.length || entries.length !== Object.keys(values).length) throw Object.assign(new Error('Payload contains protected or unknown columns.'), { statusCode: 400 });
  return entries;
};

const keyWhere = (key: any, primaryKey: string[], startIndex: number) => {
  if (!key || primaryKey.some(column => key[column] === undefined)) throw Object.assign(new Error('Complete primary key is required.'), { statusCode: 400 });
  return { clause: primaryKey.map((column, index) => `"${column}" = $${startIndex + index}`).join(' AND '), values: primaryKey.map(column => key[column]) };
};
const redactStudioRow = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, SENSITIVE_COLUMN.test(key) && value != null ? '[REDACTED]' : value]));

const createDatabaseTableRow = async (tableName: string, values: any) => {
  const metadata = await getStudioTableMetadata(tableName);
  const entries = assertColumnValues(values, metadata.editableColumns);
  const columns = entries.map(([column]) => `"${column}"`).join(', ');
  const result = await pool.query(`INSERT INTO "${tableName}" (${columns}) VALUES (${entries.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`, entries.map(([, value]) => value));
  return redactStudioRow(result.rows[0]);
};

const updateDatabaseTableRow = async (tableName: string, key: any, values: any) => {
  const metadata = await getStudioTableMetadata(tableName);
  if (!metadata.editable) throw Object.assign(new Error('This table has no primary key and cannot be edited safely.'), { statusCode: 409 });
  const entries = assertColumnValues(values, metadata.editableColumns.filter((column: string) => !metadata.primaryKey.includes(column)));
  const where = keyWhere(key, metadata.primaryKey, entries.length + 1);
  const result = await pool.query(`UPDATE "${tableName}" SET ${entries.map(([column], index) => `"${column}" = $${index + 1}`).join(', ')} WHERE ${where.clause} RETURNING *`, [...entries.map(([, value]) => value), ...where.values]);
  if (!result.rowCount) throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  return redactStudioRow(result.rows[0]);
};

const deleteDatabaseTableRow = async (tableName: string, key: any) => {
  const metadata = await getStudioTableMetadata(tableName);
  if (!metadata.editable) throw Object.assign(new Error('This table has no primary key and cannot be deleted safely.'), { statusCode: 409 });
  const where = keyWhere(key, metadata.primaryKey, 1);
  const result = await pool.query(`DELETE FROM "${tableName}" WHERE ${where.clause} RETURNING *`, where.values);
  if (!result.rowCount) throw Object.assign(new Error('Row not found.'), { statusCode: 404 });
  return redactStudioRow(result.rows[0]);
};

const getDatabaseTableRows = async (tableName: string, options: { limit?: number; offset?: number; query?: string }) => {
  await assertPublicTable(tableName);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 25));
  const offset = Math.max(0, Number(options.offset) || 0);
  const metadata = await getStudioTableMetadata(tableName);
  const columns = metadata.columns;
  const searchable = columns.filter((column: any) => !SENSITIVE_COLUMN.test(column.column_name));
  const query = String(options.query || '').trim();
  const where = query && searchable.length
    ? ` WHERE ${searchable.map((column: any) => `CAST("${column.column_name}" AS TEXT) ILIKE $1`).join(' OR ')}`
    : '';
  const params = query && searchable.length ? [`%${query}%`] : [];
  const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM "${tableName}"${where}`, params);
  const rowsResult = await pool.query(
    `SELECT * FROM "${tableName}"${where} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const rows = rowsResult.rows.map(redactStudioRow);
  return { table: tableName, columns, rows, total: Number(countResult.rows[0]?.count || 0), limit, offset, primary_key: metadata.primaryKey, editable_columns: metadata.editableColumns, editable: metadata.editable };
};

module.exports = {
  validateRedeployPassword,
  scheduleRedeploy,
  validateDevResetRequest,
  resetTable,
  getStats,
  getDatabaseTables,
  getDatabaseTableRows,
  createDatabaseTableRow,
  updateDatabaseTableRow,
  deleteDatabaseTableRow,
  RESET_CONFIRMATION,
};

export {};
