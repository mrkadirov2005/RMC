// Retention by the five leaving groups and the admissions balance, on real PostgreSQL: one
// student in each group in October 2026, and new students who came for a teacher or the center.
describe('retention breakdown with PostgreSQL', () => {
  let pool;
  let centerId;
  let teacherA;
  let teacherB;
  let oldGroup;
  let newGroup;
  let otherGroup;
  const reason = async (code) => (await pool.query(`SELECT reason_id FROM student_action_reasons WHERE reason_code = $1 LIMIT 1`, [code])).rows[0]?.reason_id
    ?? (await pool.query(`INSERT INTO student_action_reasons (reason_code, reason_name) VALUES ($1, $1) RETURNING reason_id`, [code])).rows[0].reason_id;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, payments RESTART IDENTITY CASCADE');
    await require('../../../src/modules/developer/seal').reseal();
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Retention Center', 'RET-C') RETURNING center_id`)).rows[0].center_id;
    const teacher = async (code) => (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, $2, $2, 'Teacher') RETURNING teacher_id`, [centerId, code],
    )).rows[0].teacher_id;
    teacherA = await teacher('A');
    teacherB = await teacher('B');
    const group = async (name, teacherId, startDate) => (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount, start_date) VALUES ($1, $2, $2, $3, 300000, $4) RETURNING class_id`,
      [centerId, name, teacherId, startDate],
    )).rows[0].class_id;
    oldGroup = await group('Old', teacherA, '2026-01-10');
    newGroup = await group('Fresh', teacherA, '2026-10-01');
    otherGroup = await group('Other', teacherB, '2026-01-10');
    await pool.query(`INSERT INTO subjects (center_id, class_id, subject_name) VALUES ($1, $2, 'English'), ($1, $3, 'English'), ($1, $4, 'Matematika')`, [centerId, oldGroup, newGroup, otherGroup]);

    const student = async (name, classId, extra = {}) => (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, status, start_date, end_date, deleted_at,
                             delete_reason_id, transfer_reason_id, referred_by_teacher_id, transferred_from_student_id, main_student_id)
       VALUES ($1, $2, $2, 'S', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING student_id`,
      [centerId, name, classId, extra.status || 'Active', extra.start || '2026-02-01', extra.end || null, extra.deleted || null,
        extra.deleteReason || null, extra.transferReason || null, extra.referredBy || null, extra.from || null, extra.main || null],
    )).rows[0].student_id;
    const attended = async (studentId, classId, lessons) => {
      for (let i = 0; i < lessons; i += 1) {
        await pool.query(
          `INSERT INTO attendance (center_id, student_id, class_id, teacher_id, attendance_date, status)
           VALUES ($1, $2, $3, $4, DATE '2025-01-01' + $5::int, 'Present')`,
          [centerId, studentId, classId, teacherA, i],
        );
      }
    };

    // Trial: two lessons, left in October.
    await attended(await student('trial', oldGroup, { status: 'Inactive', start: '2026-10-01', deleted: '2026-10-08' }), oldGroup, 2);
    // New group: left the group opened on 1 October after 6 lessons, on the 20th.
    await attended(await student('newgroup', newGroup, { status: 'Inactive', start: '2026-10-01', deleted: '2026-10-20' }), newGroup, 6);
    // Long-term: studying since February, left in October.
    await attended(await student('longterm', oldGroup, { status: 'Inactive', deleted: '2026-10-15' }), oldGroup, 30);
    // Graduated: finished successfully.
    await attended(await student('graduate', oldGroup, { status: 'Inactive', deleted: '2026-10-25', deleteReason: await reason('finished_successfully') }), oldGroup, 40);
    // Transfer: moved from A's group to B's on 12 October.
    const moved = await student('moved', oldGroup, { status: 'Transferred', end: '2026-10-11', transferReason: await reason('schedule_conflict') });
    await student('moved', otherGroup, { start: '2026-10-12', from: moved });
    // Still studying with A, and B's own students.
    for (const name of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']) await student(name, oldGroup);
    for (const name of ['b1', 'b2']) await student(name, otherGroup);
    // New students in October: two came asking for teacher A, one for the center; a second group of a
    // child already studying is not a new student.
    await student('new1', oldGroup, { start: '2026-10-03', referredBy: teacherA });
    await student('new2', newGroup, { start: '2026-10-04', referredBy: teacherA });
    const new3 = await student('new3', otherGroup, { start: '2026-10-05' });
    await student('new3-second', oldGroup, { start: '2026-10-06', main: new3 });
  });

  afterAll(async () => {
    const { db } = pool;
    if (db?.$client?.end) await db.$client.end().catch(() => {});
    else await pool.end?.().catch(() => {});
  });

  const breakdown = (query) => require('../../../src/modules/reports/services/retentionBreakdown.service').breakdown({ month: '2026-10', ...query }, centerId);

  test('every student who left is in one of the five groups, in order', async () => {
    const result = await breakdown({});
    expect(result.categories.map((c) => [c.key, c.students.map((s) => s.first_name)])).toEqual([
      ['trial', ['trial']],
      ['new_group', ['newgroup']],
      ['long_term', ['longterm']],
      ['graduated', ['graduate']],
      ['transfer', ['moved']],
    ]);
    expect(result.summary).toEqual({ lost: 3, graduated: 1, transfers: 1, left: 5 });
  });

  test('teachers are ranked by the share of students lost', async () => {
    const result = await breakdown({});
    const byName = Object.fromEntries(result.teacher_ranking.map((row) => [row.teacher_name, row]));
    expect(byName['A Teacher'].lost).toBe(3);
    expect(byName['B Teacher'].lost).toBe(0);
    expect(result.teacher_ranking[0].teacher_name).toBe('A Teacher');
    expect(byName['A Teacher'].lost_percent).toBeGreaterThan(0);
  });

  test('admissions: new children only, who came for a teacher, and the balance', async () => {
    const result = await breakdown({});
    // The trial and new-group students joined in October too, so they were admitted before they left;
    // the transferred student's new record and a second group of a child already studying are not new.
    expect(result.admissions.students.map((s) => s.first_name).sort()).toEqual(['new1', 'new2', 'new3', 'newgroup', 'trial']);
    expect(result.admissions).toMatchObject({ new_students: 5, left_center: 4, balance: 1, came_for_teacher: 2, came_for_center: 3 });
  });

  test('filters by teacher, subject and level', async () => {
    expect((await breakdown({ teacher_id: String(teacherB) })).summary.left).toBe(0);
    expect((await breakdown({ subject: 'Matematika' })).summary.left).toBe(0);
    expect((await breakdown({ subject: 'english' })).summary.left).toBe(5);
    expect((await breakdown({ level_id: '999' })).summary.left).toBe(0);
  });
});
