const request = require('supertest');

// The developer account end to end on PostgreSQL: owners can neither see nor change it, owner
// sign-up is closed, and the developer's locks stop logins and sessions already open (one account,
// a student across their group records, or everyone but the developer at once).
describe('developer role with PostgreSQL', () => {
  let pool;
  let server;
  let centerId;
  let developerId;
  let ownerId;
  let teacherId;
  let mainStudentId;
  let secondRecordId;

  const api = () => request(server);
  const auth = (token) => ({ Authorization: `Bearer ${token}` });
  const login = (path, username, password) => api().post(path).send({ username, password });
  let developer;
  let owner;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    const { hashPassword } = require('../../../src/shared/password');
    await pool.query('TRUNCATE TABLE edu_centers, developer_locks RESTART IDENTITY CASCADE');
    await pool.query('UPDATE owners SET is_developer = FALSE');
    await pool.query(`DELETE FROM owners WHERE username IN ('dev_root', 'boss_owner', 'self_signup')`);
    await pool.query(`DELETE FROM audit_logs WHERE entity_type = 'test'`);
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Dev Center', 'DEV-C') RETURNING center_id`)).rows[0].center_id;
    const password = hashPassword('correct-horse-1');
    developerId = (await pool.query(
      `INSERT INTO owners (username, password_hash, first_name, last_name, status, is_developer, can_hard_delete)
       VALUES ('dev_root', $1, 'Muzaffar', 'Dev', 'Active', TRUE, TRUE) RETURNING owner_id`,
      [password]
    )).rows[0].owner_id;
    ownerId = (await pool.query(
      `INSERT INTO owners (username, password_hash, first_name, last_name, status) VALUES ('boss_owner', $1, 'Boss', 'Owner', 'Active') RETURNING owner_id`,
      [password]
    )).rows[0].owner_id;
    teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name, username, password_hash, status)
       VALUES ($1, 'DEV-T1', 'Tom', 'Teacher', 'dev_teacher', $2, 'Active') RETURNING teacher_id`,
      [centerId, password]
    )).rows[0].teacher_id;
    mainStudentId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, status)
       VALUES ($1, 'DEV-S1', 'Sara', 'Student', 'dev_student', $2, 'Active') RETURNING student_id`,
      [centerId, password]
    )).rows[0].student_id;
    secondRecordId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, status, main_student_id)
       VALUES ($1, 'DEV-S1b', 'Sara', 'Student', 'Active', $2) RETURNING student_id`,
      [centerId, mainStudentId]
    )).rows[0].student_id;

    // The fixtures above were written straight to the database: sign them, as the server command does.
    await require('../../../src/modules/developer/seal').reseal();

    const { createApp } = require('../../../src/index');
    const app = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });

    developer = (await login('/api/owners/auth/login', 'dev_root', 'correct-horse-1')).body.token;
    owner = (await login('/api/owners/auth/login', 'boss_owner', 'correct-horse-1')).body.token;
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    if (pool) await pool.end();
  });

  test('the developer signs in as an owner with the developer flag, shown as "Tizim"', async () => {
    const res = await login('/api/owners/auth/login', 'dev_root', 'correct-horse-1');
    expect(res.status).toBe(200);
    expect(res.body.owner).toMatchObject({ role: 'owner', is_developer: true });
    const { verifyToken } = require('../../../src/middleware/auth');
    expect(verifyToken(res.body.token)).toMatchObject({ role: 'owner', is_developer: true, username: 'Tizim' });
    // Everything an owner can do.
    expect((await api().get('/api/owners').set(auth(developer))).status).toBe(200);
  });

  test('owners cannot see, change or remove the developer account', async () => {
    const list = (await api().get('/api/owners').set(auth(owner))).body;
    expect(list.map((row) => row.username)).toContain('boss_owner');
    expect(list.map((row) => row.username)).not.toContain('dev_root');
    expect((await api().get(`/api/owners/${developerId}`).set(auth(owner))).status).toBe(404);
    expect((await api().put(`/api/owners/${developerId}`).set(auth(owner)).send({ password: 'hijacked-pass-1' })).status).toBe(403);
    expect((await api().delete(`/api/owners/${developerId}`).set(auth(owner))).status).toBe(403);
    expect((await api().post(`/api/owners/${developerId}/change-password`).set(auth(owner)).send({ old_password: 'x', new_password: 'hijacked-pass-1' })).status).toBe(403);
    expect((await api().get('/api/developer/locks').set(auth(owner))).status).toBe(403);
    // Still signs in with the original password.
    expect((await login('/api/owners/auth/login', 'dev_root', 'correct-horse-1')).status).toBe(200);
    // The developer sees every owner, itself included.
    const all = (await api().get('/api/owners').set(auth(developer))).body.map((row) => row.username);
    expect(all).toEqual(expect.arrayContaining(['dev_root', 'boss_owner']));
  });

  test('owner sign-up is gone', async () => {
    const res = await api().post('/api/owners/auth/register').send({ username: 'self_signup', password: 'some-password-1', email: 'a@b.uz', first_name: 'A', last_name: 'B', invite_key: 'owner-create-2026' });
    // No such route any more (the owners routes around it need a signed-in owner).
    expect([401, 404]).toContain(res.status);
    expect((await pool.query(`SELECT 1 FROM owners WHERE username = 'self_signup'`)).rowCount).toBe(0);
  });

  test('a locked teacher can neither sign in nor keep using an open session; unlocking restores both', async () => {
    const teacher = (await login('/api/teachers/auth/login', 'dev_teacher', 'correct-horse-1')).body.token;
    expect((await api().get('/api/classes').set(auth(teacher))).status).toBe(200);

    const locked = await api().post('/api/developer/locks').set(auth(developer)).send({ user_type: 'teacher', user_id: teacherId, reason: 'unpaid' });
    expect(locked.status).toBe(200);
    expect((await api().get('/api/classes').set(auth(teacher))).body.code).toBe('ACCOUNT_LOCKED');
    const relogin = await login('/api/teachers/auth/login', 'dev_teacher', 'correct-horse-1');
    expect(relogin.status).toBe(423);
    expect(relogin.body.code).toBe('ACCOUNT_LOCKED');

    const found = (await api().get('/api/developer/accounts?type=teacher&q=tom').set(auth(developer))).body.items;
    expect(found).toEqual([expect.objectContaining({ user_id: teacherId, locked: true, lock_reason: 'unpaid' })]);

    expect((await api().delete(`/api/developer/locks/teacher/${teacherId}`).set(auth(developer))).status).toBe(200);
    expect((await api().get('/api/classes').set(auth(teacher))).status).toBe(200);
  });

  test('locking a student locks every group record of that person', async () => {
    await api().post('/api/developer/locks').set(auth(developer)).send({ user_type: 'student', user_id: secondRecordId });
    const rows = (await pool.query(`SELECT user_id FROM developer_locks WHERE user_type = 'student' ORDER BY user_id`)).rows.map((row) => row.user_id);
    expect(rows).toEqual([mainStudentId, secondRecordId]);
    expect((await login('/api/students/auth/login', 'dev_student', 'correct-horse-1')).status).toBe(423);
    await api().delete(`/api/developer/locks/student/${mainStudentId}`).set(auth(developer));
    expect((await login('/api/students/auth/login', 'dev_student', 'correct-horse-1')).status).toBe(200);
  });

  test('the developer can lock owners but can never be locked', async () => {
    expect((await api().post('/api/developer/locks').set(auth(developer)).send({ user_type: 'owner', user_id: developerId })).status).toBe(404);
    await api().post('/api/developer/locks').set(auth(developer)).send({ user_type: 'owner', user_id: ownerId });
    expect((await api().get('/api/owners').set(auth(owner))).status).toBe(423);
    expect((await login('/api/owners/auth/login', 'boss_owner', 'correct-horse-1')).status).toBe(423);
    await api().delete(`/api/developer/locks/owner/${ownerId}`).set(auth(developer));
    expect((await api().get('/api/owners').set(auth(owner))).status).toBe(200);
  });

  test('locking everyone stops every account but the developer', async () => {
    const on = await api().put('/api/developer/lockdown').set(auth(developer)).send({ enabled: true, reason: 'maintenance' });
    expect(on.body).toMatchObject({ enabled: true, reason: 'maintenance' });
    const blocked = await api().get('/api/owners').set(auth(owner));
    expect(blocked.status).toBe(423);
    expect(blocked.body.code).toBe('SYSTEM_LOCKED');
    expect((await login('/api/teachers/auth/login', 'dev_teacher', 'correct-horse-1')).status).toBe(423);
    expect((await api().get('/api/owners').set(auth(developer))).status).toBe(200);
    expect((await login('/api/owners/auth/login', 'dev_root', 'correct-horse-1')).status).toBe(200);

    expect((await api().put('/api/developer/lockdown').set(auth(developer)).send({ enabled: false })).body.enabled).toBe(false);
    expect((await api().get('/api/owners').set(auth(owner))).status).toBe(200);
  });

  test('a password lockout lifts after 15 minutes, or at once from the developer page', async () => {
    // (Few sign-ins here: the login rate limit allows 20 a minute.)
    for (let i = 0; i < 5; i += 1) await login('/api/owners/auth/login', 'boss_owner', 'wrong-password');
    const owners = (await api().get('/api/developer/owners').set(auth(developer))).body.items;
    expect(owners.find((row) => row.owner_id === ownerId)).toMatchObject({ is_locked: true });

    await pool.query(`UPDATE owners SET locked_at = CURRENT_TIMESTAMP - interval '16 minutes' WHERE owner_id = $1`, [ownerId]);
    expect((await login('/api/owners/auth/login', 'boss_owner', 'correct-horse-1')).status).toBe(200);

    await pool.query(`UPDATE owners SET is_locked = TRUE, login_attempts = 5, locked_at = CURRENT_TIMESTAMP WHERE owner_id = $1`, [ownerId]);
    expect((await api().post(`/api/developer/owners/${ownerId}/unlock`).set(auth(developer))).status).toBe(200);
    expect((await pool.query('SELECT is_locked FROM owners WHERE owner_id = $1', [ownerId])).rows[0].is_locked).toBe(false);

    expect((await api().post(`/api/developer/owners/${ownerId}/password`).set(auth(developer)).send({ password: 'brand-new-pass' })).status).toBe(200);
    expect((await login('/api/owners/auth/login', 'boss_owner', 'brand-new-pass')).status).toBe(200);
  });

  test("the developer's audit rows are hidden from owners", async () => {
    const { logAudit } = require('../../../src/utils/audit');
    const { runWithUser } = require('../../../src/shared/requestContext');
    await new Promise((resolve) => runWithUser({ id: developerId, userType: 'superuser', role: 'owner', is_developer: true }, () => {
      logAudit({ user_type: 'superuser', user_id: developerId, action: 'dev-action', entity_type: 'test', center_id: centerId }).then(resolve);
    }));
    await logAudit({ user_type: 'superuser', user_id: ownerId, action: 'owner-action', entity_type: 'test', center_id: centerId });
    const ownerView = (await api().get(`/api/audit-logs?entity_type=test&center_id=${centerId}`).set(auth(owner))).body.map((row) => row.action);
    expect(ownerView).toEqual(['owner-action']);
    const developerView = (await api().get(`/api/audit-logs?entity_type=test&center_id=${centerId}`).set(auth(developer))).body.map((row) => row.action);
    expect(developerView).toEqual(expect.arrayContaining(['owner-action', 'dev-action']));
  });
  describe('changes made straight in the database', () => {
    const accessLock = () => require('../../../src/modules/developer/accessLock');
    const seal = () => require('../../../src/modules/developer/seal');
    const fresh = () => accessLock().clearCache();

    test('a lock deleted in the database closes the system for everyone but the developer, who restores it', async () => {
      await api().post('/api/developer/locks').set(auth(developer)).send({ user_type: 'teacher', user_id: teacherId, reason: 'unpaid' });
      await pool.query(`DELETE FROM developer_locks WHERE user_type = 'teacher'`);
      fresh();

      const blocked = await api().get('/api/owners').set(auth(owner));
      expect(blocked.status).toBe(423);
      expect(blocked.body.code).toBe('SYSTEM_LOCKED');
      expect((await login('/api/teachers/auth/login', 'dev_teacher', 'correct-horse-1')).status).toBe(423);

      const status = (await api().get('/api/developer/seal').set(auth(developer))).body;
      expect(status).toMatchObject({ intact: false, authentic: true, locks_removed: [`teacher:${teacherId}`] });
      // No new changes until the developer has dealt with it.
      expect((await api().post('/api/developer/locks').set(auth(developer)).send({ user_type: 'owner', user_id: ownerId })).body.code).toBe('SEAL_BROKEN');

      expect((await api().post('/api/developer/seal/restore').set(auth(developer))).status).toBe(200);
      expect((await pool.query(`SELECT 1 FROM developer_locks WHERE user_type = 'teacher' AND user_id = $1`, [teacherId])).rowCount).toBe(1);
      expect((await api().get('/api/owners').set(auth(owner))).status).toBe(200);
      await api().delete(`/api/developer/locks/teacher/${teacherId}`).set(auth(developer));
    });

    test('an owner made developer in the database gets nothing; restoring takes it back', async () => {
      await pool.query('UPDATE owners SET is_developer = TRUE WHERE owner_id = $1', [ownerId]);
      fresh();
      // Refused at sign-in, and the session already open stops too.
      const signIn = await login('/api/owners/auth/login', 'boss_owner', 'brand-new-pass');
      expect(signIn.status).toBe(423);
      expect((await api().get('/api/owners').set(auth(owner))).status).toBe(423);
      expect((await api().get('/api/developer/seal').set(auth(developer))).body.developers_added).toEqual([ownerId]);

      await api().post('/api/developer/seal/restore').set(auth(developer));
      expect((await pool.query('SELECT is_developer FROM owners WHERE owner_id = $1', [ownerId])).rows[0].is_developer).toBe(false);
      expect((await api().get('/api/owners').set(auth(owner))).status).toBe(200);
    });

    test("the developer's password replaced in the database is put back by restoring", async () => {
      const { hashPassword, verifyPassword } = require('../../../src/shared/password');
      await pool.query('UPDATE owners SET password_hash = $2 WHERE owner_id = $1', [developerId, hashPassword('stolen-pass-1')]);
      fresh();
      expect((await api().get('/api/developer/seal').set(auth(developer))).body.developers_changed).toEqual([developerId]);
      await api().post('/api/developer/seal/restore').set(auth(developer));
      const hash = (await pool.query('SELECT password_hash FROM owners WHERE owner_id = $1', [developerId])).rows[0].password_hash;
      expect(verifyPassword('correct-horse-1', hash).valid).toBe(true);
    });

    test('a forged seal locks everyone, the developer too, until the server command signs again', async () => {
      await pool.query(`UPDATE developer_seal SET payload = '{"v":1,"locks":[],"developers":[]}'`);
      fresh();
      expect((await api().get('/api/owners').set(auth(developer))).status).toBe(423);
      expect((await api().get('/api/owners').set(auth(owner))).status).toBe(423);
      await seal().reseal();
      fresh();
      expect((await api().get('/api/owners').set(auth(developer))).status).toBe(200);
    });

    test('a developer account cannot be edited or removed through the owner screens', async () => {
      expect((await api().put(`/api/owners/${developerId}`).set(auth(developer)).send({ first_name: 'X' })).body.code).toBe('DEVELOPER_ACCOUNT');
      expect((await api().delete(`/api/owners/${developerId}`).set(auth(developer))).body.code).toBe('DEVELOPER_ACCOUNT');
    });
  });
});
