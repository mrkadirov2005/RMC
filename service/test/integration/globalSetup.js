const path = require('path');
const { execFileSync } = require('child_process');
const { Client } = require('pg');

module.exports = async () => {
  const database = process.env.TEST_DB_NAME || 'crm_backend_test';
  if (!/^crm_[a-z0-9_]*test[a-z0-9_]*$/i.test(database)) {
    throw new Error(`Refusing to prepare non-test database: ${database}`);
  }

  const connection = {
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 5432),
    user: process.env.TEST_DB_USER || 'crm_user',
    password: process.env.TEST_DB_PASSWORD || 'crm_password',
  };
  const admin = new Client({ ...connection, database: 'postgres' });
  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${database}"`);
    }
  } finally {
    await admin.end();
  }

  const serviceRoot = path.resolve(__dirname, '..', '..');
  const sequelizeCli = path.join(serviceRoot, 'node_modules', '.bin', 'sequelize-cli');
  execFileSync(sequelizeCli, ['db:migrate'], {
    cwd: serviceRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DB_HOST: connection.host,
      DB_PORT: String(connection.port),
      DB_USER: connection.user,
      DB_PASSWORD: connection.password,
      DB_NAME: database,
    },
  });
};
