// Drizzle Studio connects with the same DB_* settings as the backend, so the
// local .env and the Docker containers both work without editing this file.
require('dotenv').config();

module.exports = {
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  dbCredentials: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'crm_user',
    password: process.env.DB_PASSWORD || 'crm_password',
    database: process.env.DB_NAME || 'crm_db',
    ssl: false,
  },
};
