require('dotenv/config');

const databaseConfig = {
  username: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || 'crm_password',
  database: process.env.DB_NAME || 'crm_db',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  dialect: 'postgres',
};

module.exports = {
  development: databaseConfig,
  test: databaseConfig,
  production: databaseConfig
};
