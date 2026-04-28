export {};

// Single import path for pg Pool + drizzle helpers from all modules.
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { sql } = require('drizzle-orm');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || 'crm_password',
  database: process.env.DB_NAME || 'crm_db',
});

const db = drizzle(pool);

pool.on('error', (err: any) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
module.exports.db = db;
module.exports.sql = sql;
