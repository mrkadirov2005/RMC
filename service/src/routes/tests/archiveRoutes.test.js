const request = require('supertest');
const express = require('express');

const mockControllers = {
  getArchive: jest.fn((_req, res) => res.json({ route: 'list' })),
  restoreArchiveItem: jest.fn((_req, res) => res.json({ route: 'restore' })),
  purgeArchiveItem: jest.fn((_req, res) => res.json({ route: 'purge' })),
};

jest.mock('../../modules/archive/controllers/archive.controller', () => mockControllers);

// Deliberately NOT mocking middleware/auth: this test exercises the real
// requireMuzaffarHardDelete middleware wired onto the purge route, so it proves the route is
// actually gated by the new `can_hard_delete` permission flag (RMC-015/RMC-048) rather than the
// old hardcoded `username === 'muzaffar'` check.
const archiveRoutes = require('../archiveRoutes');

const appWithUser = (user) => {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/archive', archiveRoutes);
  return app;
};

describe('archive routes purge permission (RMC-015/RMC-048)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('blocks a superuser without can_hard_delete from purging, with no username special-case', async () => {
    const app = appWithUser({ userType: 'superuser', role: 'owner', can_hard_delete: false, username: 'someone-else' });

    const response = await request(app).delete('/archive/students/1/purge').expect(403);

    expect(response.body).toEqual({ error: 'You do not have permission to permanently delete records.' });
    expect(mockControllers.purgeArchiveItem).not.toHaveBeenCalled();
  });

  it('allows a superuser with can_hard_delete=true to purge, regardless of username', async () => {
    const app = appWithUser({ userType: 'superuser', role: 'admin', can_hard_delete: true, username: 'not-muzaffar' });

    await request(app).delete('/archive/students/1/purge').expect(200);

    expect(mockControllers.purgeArchiveItem).toHaveBeenCalledTimes(1);
  });

  it('blocks a non-superuser (e.g. teacher) from purging even with can_hard_delete truthy on the token', async () => {
    const app = appWithUser({ userType: 'teacher', can_hard_delete: true });

    await request(app).delete('/archive/students/1/purge').expect(403);

    expect(mockControllers.purgeArchiveItem).not.toHaveBeenCalled();
  });

  it('does not gate restore or list behind the hard-delete permission', async () => {
    const app = appWithUser({ userType: 'superuser', role: 'admin', can_hard_delete: false });

    await request(app).get('/archive').expect(200);
    await request(app).post('/archive/students/1/restore').expect(200);

    expect(mockControllers.getArchive).toHaveBeenCalledTimes(1);
    expect(mockControllers.restoreArchiveItem).toHaveBeenCalledTimes(1);
  });
});
