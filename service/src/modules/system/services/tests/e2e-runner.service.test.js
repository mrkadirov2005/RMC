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
    expect(catalog.flows).toHaveLength(321);
    expect(catalog.flows.map((flow) => flow.id)).toEqual(expect.arrayContaining(['ALL', 'WF-001', 'WF-320']));
    expect(catalog.flows[0]).toEqual(expect.not.objectContaining({ spec: expect.anything(), grep: expect.anything() }));
  });

  test('publishes the same catalog regardless of NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    expect(service.getCatalog().flows).toHaveLength(321);
  });

  test('refuses a database name that is not dedicated to E2E', () => {
    process.env.E2E_DB_NAME = 'crm_db';
    expect(() => service.assertSafeDatabase()).toThrow(/e2e_test/i);
    expect(() => service.startRun('WF-001')).toThrow(/e2e_test/i);
  });

  test('rejects arbitrary flow IDs before spawning a process', () => {
    expect(() => service.startRun('../../dangerous-command')).toThrow(/unknown E2E flow/i);
    expect(service.getStatus()).toEqual({ active: null, recent: [] });
  });

  test('reports a selected fixme workflow as skipped instead of passed', () => {
    expect(service.getCompletedStatus('WF-001', '  1 skipped\n', 0, null)).toBe('skipped');
    expect(service.getCompletedStatus('WF-001', '  1 passed\n', 0, null)).toBe('passed');
    expect(service.getCompletedStatus('ALL', '  20 passed\n  3 skipped\n', 0, null)).toBe('passed');
  });
});
