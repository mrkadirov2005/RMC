const request = require('supertest');
const { generateToken } = require('../../../src/middleware/auth');

describe('Express application', () => {
  let app;
  let server;

  beforeAll(async () => {
    const { createApp } = require('../../../src/index');
    app = await createApp({
      initializeDatabase: false,
      initializeMongo: false,
    });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
  });

  afterAll(async () => {
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    // Importing the route graph initializes the shared PostgreSQL pool even when
    // createApp skips migrations. Close it so Jest can terminate cleanly.
    await require('../../../src/db/pool').end();
  });

  test('can be imported without starting a listener and serves health checks', async () => {
    expect(app.listen).toEqual(expect.any(Function));

    const response = await request(server).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'OK',
      message: 'CRM Backend Server is running',
    });
  });

  test.each([
    [undefined, 'Authentication required'],
    ['Bearer invalid', 'Invalid token'],
  ])('protects center-scoped APIs for authorization %s', async (authorization, message) => {
    const call = request(server).get('/api/students');
    if (authorization) call.set('Authorization', authorization);

    const response = await call;

    expect(response.status).toBe(401);
    expect(response.body.error).toContain(message);
  });

  test('rejects a valid student token from a superuser/teacher route before controller access', async () => {
    const token = generateToken({ id: 12, userType: 'student', center_id: 2 });

    const response = await request(server)
      .get('/api/students')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ current: 'student' });
  });

  test('rejects a non-owner superuser from owner APIs before controller access', async () => {
    const token = generateToken({ id: 3, userType: 'superuser', role: 'admin', center_id: 2 });

    const response = await request(server)
      .get('/api/owners')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Owner privileges');
  });
});
