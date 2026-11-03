const request = require('supertest');

// A teacher's student count in the teachers list is the students in their groups now — the same
// number the teacher sees in their own profile. A transferred-out row, a student who moved to
// another teacher's group but still has this teacher on their record, and a student with no
// group are not theirs.
describe('teacher student count with PostgreSQL', () => {
  let pool;
  let server;
  let admin;
  let alisher;
  let bekzod;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers RESTART IDENTITY CASCADE');
    const centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Count Center', 'CT-C') RETURNING center_id`)).rows[0].center_id;
    const teacher = async (code) =>
      (await pool.query(`INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, $2, $2, 'T') RETURNING teacher_id`, [centerId, code])).rows[0].teacher_id;
    alisher = await teacher('Alisher');
    bekzod = await teacher('Bekzod');
    const group = async (code, teacherId) =>
      (await pool.query(`INSERT INTO classes (center_id, class_name, class_code, teacher_id) VALUES ($1, $2, $2, $3) RETURNING class_id`, [centerId, code, teacherId])).rows[0].class_id;
    const a1 = await group('CT-A1', alisher);
    const b1 = await group('CT-B1', bekzod);
    const student = (code, classId, teacherId, status = 'Active') =>
      pool.query(
        `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status) VALUES ($1, $2, $2, 'S', $3, $4, $5)`,
        [centerId, code, classId, teacherId, status]
      );
    await student('CT-1', a1, alisher);
    await student('CT-2', a1, alisher);
    await student('CT-3', a1, alisher, 'Transferred'); // left in the old group
    await student('CT-4', b1, alisher); // moved to Bekzod's group, record still names Alisher
    await student('CT-5', null, alisher); // no group

    const { generateToken } = require('../../../src/middleware/auth');
    admin = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
    const { createApp } = require('../../../src/index');
    const app = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    if (pool) await pool.end();
  });

  test('counts only the students in the teacher\'s groups now', async () => {
    const res = await request(server).get('/api/teachers').set({ Authorization: `Bearer ${admin}` });
    expect(res.status).toBe(200);
    const rows = Array.isArray(res.body) ? res.body : res.body.data || res.body.items || [];
    const byId = new Map(rows.map((row) => [row.teacher_id, row]));
    expect(byId.get(alisher).student_count).toBe(2);
    expect(byId.get(bekzod).student_count).toBe(1);
  });
});
