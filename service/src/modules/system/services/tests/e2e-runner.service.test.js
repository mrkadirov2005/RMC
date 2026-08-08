describe('E2E runner service', () => {
  const originalEnv = { ...process.env };
  let service;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'test', E2E_DB_NAME: 'crm_frontend_e2e_test' };
    service = require('../e2e-runner.service');
    service.resetForTests();
  });

  afterAll(() => { process.env = originalEnv; });

  test('publishes the complete allowlist without exposing command arguments or paths', () => {
    const catalog = service.getCatalog();
    expect(catalog.flows).toHaveLength(30);
    expect(catalog.flows.map((flow) => flow.id)).toEqual(expect.arrayContaining(['ALL', 'E2E-01', 'E2E-24', 'CHAIN-A', 'CHAIN-E']));
    expect(catalog.flows[0]).toEqual(expect.not.objectContaining({ spec: expect.anything(), grep: expect.anything() }));
  });

  test('publishes the same catalog regardless of NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    expect(service.getCatalog().flows).toHaveLength(30);
  });

  test('refuses a database name that is not dedicated to E2E', () => {
    process.env.E2E_DB_NAME = 'crm_db';
    expect(() => service.assertSafeDatabase()).toThrow(/e2e_test/i);
    expect(() => service.startRun('E2E-01')).toThrow(/e2e_test/i);
  });

  test('rejects arbitrary flow IDs before spawning a process', () => {
    expect(() => service.startRun('../../dangerous-command')).toThrow(/unknown E2E flow/i);
    expect(service.getStatus()).toEqual({ active: null, recent: [] });
  });
});
