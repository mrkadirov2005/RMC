const request = require('supertest');

// A student's journey: every record of the same child, the teachers they had, and how each
// stretch ended.
describe('student journey with PostgreSQL', () => {
  let pool;
  let server;
  let centerId;
  const t = {};
  const g = {};
  const s = {};
  const tokens = {};
  const api = () => request(server);
  const auth = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, class_teacher_history, payments, attendance RESTART IDENTITY CASCADE');
    await require('../../../src/modules/developer/seal').reseal();
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Journey', 'JR-C') RETURNING center_id`)).rows[0].center_id;
    const teacher = async (key, first) => {
      t[key] = (await pool.query(
        `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, $2, $3, 'T') RETURNING teacher_id`,
        [centerId, `JR-${key}`, first],
      )).rows[0].teacher_id;
    };
    await teacher('temur', 'Temurbek');
    await teacher('kifoyat', 'Kifoyat');
    await teacher('islom', 'Islomjon');
    const group = async (key, name, teacherId) => {
      g[key] = (await pool.query(
        `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount, section, created_at)
         VALUES ($1, $2, $3, $4, 320000, '{"days":["Monday","Wednesday","Friday"]}', '2026-01-01') RETURNING class_id`,
        [centerId, name, `JR-${key}`, teacherId],
      )).rows[0].class_id;
    };
    await group('flyers', 'A2 Flyers', t.temur);
    await group('movers', 'Movers', t.kifoyat);
    const reason = async (type, code, name) => (await pool.query(
      `INSERT INTO student_action_reasons (reason_type, reason_code, reason_name, active, created_at)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
       ON CONFLICT (reason_type, reason_code) DO UPDATE SET reason_name = EXCLUDED.reason_name RETURNING reason_id`,
      [type, code, name],
    )).rows[0].reason_id;
    const dislike = await reason('transfer', 'disliked_teacher', 'Ustoz yoqmadi');
    const otherCenter = await reason('delete', 'other_center', 'Boshqa markazga ketdi');
    const student = async (key, fields) => {
      const row = {
        enrollment_number: key, first_name: 'Islom', last_name: 'Latipov', phone: '+998 88 390 18 92',
        status: 'Active', class_id: null, teacher_id: null, start_date: null, end_date: null,
        created_at: '2026-01-10', deleted_at: null, transferred_from_student_id: null,
        transfer_reason_id: null, delete_reason_id: null, delete_reason_note: null, ...fields,
      };
      s[key] = (await pool.query(
        `INSERT INTO students (center_id, enrollment_number, first_name, last_name, phone, status, class_id, teacher_id,
           start_date, end_date, created_at, deleted_at, transferred_from_student_id, transfer_reason_id, delete_reason_id, delete_reason_note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING student_id`,
        [centerId, row.enrollment_number, row.first_name, row.last_name, row.phone, row.status, row.class_id, row.teacher_id,
          row.start_date, row.end_date, row.created_at, row.deleted_at, row.transferred_from_student_id,
          row.transfer_reason_id, row.delete_reason_id, row.delete_reason_note],
      )).rows[0].student_id;
    };
    // First time: Jan–Mar 2026 in Flyers, then left for another center.
    await student('OLD-1', { class_id: g.flyers, teacher_id: t.temur, start_date: '2026-01-10', deleted_at: '2026-03-31',
      delete_reason_id: otherCenter, delete_reason_note: 'Everest' });
    // Came back with a new record (new enrollment number, same phone and name): Flyers from Sept.
    await student('RMC01007', { class_id: g.flyers, teacher_id: t.temur, start_date: '2026-09-01', end_date: '2026-10-05',
      status: 'Transferred', transfer_reason_id: dislike, created_at: '2026-09-01' });
    // Transferred to Movers on 6 Oct.
    await student('RMC01007b', { enrollment_number: 'RMC01007', class_id: g.movers, teacher_id: t.kifoyat, start_date: '2026-10-06',
      transferred_from_student_id: s.RMC01007, created_at: '2026-10-05' });
    // A sister with the same parent phone: not the same child.
    await student('SIS-1', { first_name: 'Nigina', class_id: g.movers, teacher_id: t.kifoyat });
    await pool.query(
      `INSERT INTO payments (student_id, center_id, payment_date, amount, original_amount, currency, payment_method, payment_status, payment_type, receipt_number)
       VALUES ($1, $2, '2026-10-31', 300000, 300000, 'UZS', 'Cash', 'Completed', 'Tuition', 'JR-1')`,
      [s.RMC01007b, centerId],
    );
    // Movers changed teacher: from now on Islomjon teaches it (recorded by the trigger).
    await pool.query('UPDATE classes SET teacher_id = $1 WHERE class_id = $2', [t.islom, g.movers]);

    const { createApp } = require('../../../src/index');
    const expressApp = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = expressApp.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const { generateToken } = require('../../../src/middleware/auth');
    tokens.admin = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
    tokens.teacher = generateToken({ id: t.kifoyat, userType: 'teacher', center_id: centerId, username: 'kifoyat' });
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const { db } = pool;
    if (db?.$client?.end) await db.$client.end().catch(() => {});
    else await pool.end?.().catch(() => {});
  });

  test('the trigger keeps every group teacher change', async () => {
    const rows = (await pool.query('SELECT teacher_id, previous_teacher_id, source FROM class_teacher_history WHERE class_id = $1 ORDER BY history_id', [g.movers])).rows;
    expect(rows).toEqual([
      { teacher_id: t.kifoyat, previous_teacher_id: null, source: 'created' },
      { teacher_id: t.islom, previous_teacher_id: t.kifoyat, source: 'changed' },
    ]);
  });

  test('the journey joins every record of the child, newest first, and leaves the sister out', async () => {
    const res = await api().get(`/api/students/${s.RMC01007b}/journey`).set(auth('admin'));
    expect(res.status).toBe(200);
    const ids = res.body.stints.map((stint) => stint.student_id);
    expect(ids).toEqual([s.RMC01007b, s.RMC01007, s['OLD-1']]);
    expect(ids).not.toContain(s['SIS-1']);
    const [movers, flyers, first] = res.body.stints;
    expect(movers).toMatchObject({ outcome: 'active', class_name: 'Movers', matched_by: 'self', paid: 300000, to: null });
    expect(flyers).toMatchObject({
      outcome: 'transferred', transfer_reason: 'Ustoz yoqmadi', from: '2026-09-01', to: '2026-10-05', days: 35,
      matched_by: 'transfer', transferred_to: { student_id: s.RMC01007b, class_name: 'Movers' },
    });
    expect(first).toMatchObject({ outcome: 'left', leave_reason: 'Boshqa markazga ketdi', leave_note: 'Everest', matched_by: 'phone' });
    // Movers: Kifoyat until the swap, then Islomjon.
    expect(movers.teachers.map((teacher) => teacher.name)).toEqual(['Kifoyat T', 'Islomjon T']);
    expect(movers.expected).toBeGreaterThan(0);
  });

  test('time with each teacher, and the summary', async () => {
    const { body } = await api().get(`/api/students/${s['OLD-1']}/journey`).set(auth('admin'));
    const byName = Object.fromEntries(body.teachers.map((teacher) => [teacher.name, teacher]));
    expect(byName['Temurbek T'].groups).toEqual(['A2 Flyers']);
    expect(byName['Temurbek T'].days).toBe(81 + 35);
    expect(byName['Temurbek T'].outcomes).toEqual(expect.arrayContaining(['left: Boshqa markazga ketdi', 'transferred: Ustoz yoqmadi']));
    expect(byName['Islomjon T'].current).toBe(true);
    expect(body.summary).toMatchObject({ first_day: '2026-01-10', status: 'active', groups: 2, teachers: 3, paid: 300000 });
  });

  test('teachers cannot open it', async () => {
    expect((await api().get(`/api/students/${s.RMC01007b}/journey`).set(auth('teacher'))).status).toBe(403);
  });
});
