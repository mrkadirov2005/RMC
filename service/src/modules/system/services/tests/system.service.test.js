const execute = jest.fn(); const query = jest.fn();
jest.mock('../../../../db/pool', () => ({ db: { execute }, query }));
jest.mock('drizzle-orm', () => ({ sql: Object.assign(jest.fn(), { raw: jest.fn((value) => value) }) }));
const service = require('../system.service');

describe('system service safety', () => {
  const originalEnv = process.env;
  beforeEach(() => { jest.clearAllMocks(); process.env = { ...originalEnv, NODE_ENV: 'test' }; });
  afterAll(() => { process.env = originalEnv; });
  test('requires configured redeploy password and uses constant-time validation outcomes', () => {
    expect(() => service.validateRedeployPassword('x')).toThrow('not configured');
    process.env.SERVER_REDEPLOY_PASSWORD = 'secret';
    expect(() => service.validateRedeployPassword('wrong')).toThrow('Invalid');
    expect(() => service.validateRedeployPassword('secret')).not.toThrow();
  });
  test('requires exact destructive reset confirmation and honors disable flag', () => {
    expect(() => service.validateDevResetRequest('bad')).toThrow('Invalid confirmation');
    expect(() => service.validateDevResetRequest(service.RESET_CONFIRMATION)).not.toThrow();
    process.env.OWNER_DATA_RESET_ENABLED = 'false';
    expect(() => service.validateDevResetRequest(service.RESET_CONFIRMATION)).toThrow('disabled');
  });
  test('reports database health and degrades to unhealthy on failure', async () => {
    execute.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    await expect(service.getStats()).resolves.toMatchObject({ status: 'OK', database: { status: 'healthy' } });
    execute.mockRejectedValueOnce(new Error('down'));
    await expect(service.getStats()).resolves.toMatchObject({ status: 'OK', database: { status: 'unhealthy', latencyMs: null } });
  });
  test('rejects unsafe or nonexistent table names before row queries', async () => {
    await expect(service.getDatabaseTableRows('students; DROP TABLE students', {})).rejects.toMatchObject({ statusCode: 400 });
    query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(service.getDatabaseTableRows('missing_table', {})).rejects.toMatchObject({ statusCode: 404 });
  });
  test('redacts sensitive columns and clamps pagination', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [{ column_name: 'username' }, { column_name: 'password_hash' }] })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({ rows: [{ username: 'a', password_hash: 'secret' }] });
    const result = await service.getDatabaseTableRows('students', { limit: 1000, offset: -5, query: 'a' });
    expect(result).toMatchObject({ limit: 100, offset: 0, rows: [{ username: 'a', password_hash: '[REDACTED]' }] });
  });
});
