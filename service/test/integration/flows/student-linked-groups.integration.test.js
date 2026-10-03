const bcrypt = require('bcryptjs');

describe('one login across several group records with PostgreSQL', () => {
  let pool;
  let studentRepository;
  let studentService;
  let portalController;
  let centerId;
  let teacherId;
  let mathId;
  let englishId;
  let physicsId;
  let reasonId;

  const insertStudent = async (enrollment, classId, username = null) => (await pool.query(
    `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, class_id, teacher_id, status, coins, phone)
     VALUES ($1, $2, 'Ali', 'Valiyev', $3, $4, $5, $6, 'Active', 20, '+998901112233') RETURNING student_id`,
    [centerId, enrollment, username, username ? bcrypt.hashSync('secret-pass', 10) : null, classId, teacherId]
  )).rows[0].student_id;

  const record = async (id) => (await pool.query(
    'SELECT student_id, username, password_hash IS NOT NULL AS has_password, main_student_id, coins, class_id, status, deleted_at IS NOT NULL AS deleted FROM students WHERE student_id = $1',
    [id]
  )).rows[0];

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Linked Center', 'LNK-A') RETURNING center_id`)).rows[0].center_id;
    teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'LNK-T', 'Test', 'Teacher') RETURNING teacher_id`, [centerId]
    )).rows[0].teacher_id;
    const makeClass = async (name) => (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, $2, $3, $4, 300000) RETURNING class_id`,
      [centerId, name, `LNK-${name}`, teacherId]
    )).rows[0].class_id;
    mathId = await makeClass('Math');
    englishId = await makeClass('English');
    physicsId = await makeClass('Physics');
    reasonId = (await pool.query(
      `INSERT INTO student_action_reasons (reason_type, reason_code, reason_name, active)
       VALUES ('transfer', 'moved_group', 'Moved group', true)
       ON CONFLICT (reason_type, reason_code) DO UPDATE SET active = true
       RETURNING reason_id`
    )).rows[0].reason_id;
    studentRepository = require('../../../src/modules/students/repositories/student.repository');
    studentService = require('../../../src/modules/students/services/student.service');
    portalController = require('../../../src/modules/portal/controllers/portal.controller');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  test('assigning a new group creates a login-less record pointing at the main one', async () => {
    const mainId = await insertStudent('LNK-1', mathId, 'ali_v');

    const result = await studentRepository.assignToGroup(mainId, englishId, centerId);

    expect(await record(result.student.student_id)).toMatchObject({
      username: null, has_password: false, main_student_id: mainId, coins: 0, class_id: englishId, status: 'Active',
    });
    // The same group twice is refused, from either record.
    await expect(studentRepository.assignToGroup(result.student.student_id, englishId, centerId)).resolves.toEqual({ error: 'already_in_group' });
    await expect(studentRepository.assignToGroup(mainId, mathId, centerId)).resolves.toEqual({ error: 'already_in_group' });
  });

  test('the student logs in with the same username and password and sees every group', async () => {
    const roomId = (await pool.query(
      `INSERT INTO physical_rooms (center_id, name, capacity) VALUES ($1, 'Room 7', 12) RETURNING physical_room_id`, [centerId]
    )).rows[0].physical_room_id;
    for (const classId of [mathId, englishId]) {
      await pool.query(
        `INSERT INTO rooms (center_id, room_number, physical_room_id, class_id, day, time) VALUES ($1, 'Room 7', $2, $3, 'Monday', $4)`,
        [centerId, roomId, classId, classId === mathId ? '09:00' : '11:00']
      );
    }
    const login = await studentService.authenticate('ali_v', 'secret-pass');
    expect(login.kind).toBe('ok');

    const res = { json: jest.fn(), status: jest.fn(() => res) };
    await portalController.getDashboardData({ user: { id: login.student.student_id, center_id: centerId } }, res);
    const body = res.json.mock.calls[0][0];

    expect(body.groups.map((group) => group.class_name).sort()).toEqual(['English', 'Math']);
    expect(body.student.coins).toBe(20);
    expect(body.schedule.map((lesson) => lesson.classId).sort()).toEqual([mathId, englishId].sort());
    expect(body.schedule[0].capacity).toBe(12);
  });

  test('setting the password on a group record changes the main record login', async () => {
    const mainId = (await pool.query(`SELECT student_id FROM students WHERE username = 'ali_v'`)).rows[0].student_id;
    const linkedId = (await pool.query('SELECT student_id FROM students WHERE main_student_id = $1', [mainId])).rows[0].student_id;

    await studentService.setPasswordByAdmin(linkedId, 'ali_v', 'new-pass-1', centerId);

    expect((await studentService.authenticate('ali_v', 'new-pass-1')).kind).toBe('ok');
    expect(await record(linkedId)).toMatchObject({ username: null, has_password: false });
    // A group record never gets its own login through a normal edit.
    await studentRepository.update(linkedId, { username: 'second_login' }, centerId);
    expect((await record(linkedId)).username).toBeNull();
  });

  test('transferring the main record keeps the login and re-points the other groups', async () => {
    const oldMainId = (await pool.query(`SELECT student_id FROM students WHERE username = 'ali_v' AND status = 'Active'`)).rows[0].student_id;
    const linkedId = (await pool.query('SELECT student_id FROM students WHERE main_student_id = $1', [oldMainId])).rows[0].student_id;

    await expect(studentRepository.transferToClass(oldMainId, englishId, reasonId, centerId)).resolves.toEqual({ error: 'already_in_group' });
    const result = await studentRepository.transferToClass(oldMainId, physicsId, reasonId, centerId);
    const newMainId = result.student.student_id;

    expect(await record(newMainId)).toMatchObject({ username: 'ali_v', main_student_id: null, class_id: physicsId });
    expect((await record(linkedId)).main_student_id).toBe(newMainId);
    expect((await studentService.authenticate('ali_v', 'new-pass-1')).student.student_id).toBe(newMainId);
  });

  test('removing the main record hands the login and coins to the next group record', async () => {
    const mainId = (await pool.query(`SELECT student_id FROM students WHERE username = 'ali_v' AND status = 'Active'`)).rows[0].student_id;
    const linkedId = (await pool.query(`SELECT student_id FROM students WHERE main_student_id = $1 AND status = 'Active'`, [mainId])).rows[0].student_id;
    const coinsBefore = Number((await record(mainId)).coins) + Number((await record(linkedId)).coins);

    await studentRepository.remove(mainId, reasonId, centerId);

    expect(await record(mainId)).toMatchObject({ deleted: true, username: null, main_student_id: linkedId });
    expect(await record(linkedId)).toMatchObject({ username: 'ali_v', has_password: true, main_student_id: null, coins: coinsBefore });
    expect((await studentService.authenticate('ali_v', 'new-pass-1')).student.student_id).toBe(linkedId);
    const groups = await studentService.listLinkedGroups(linkedId, centerId);
    expect(groups[0]).toMatchObject({ student_id: linkedId, is_main: true });
  });

  test('a student with no other groups keeps working exactly as before', async () => {
    const soloId = await insertStudent('LNK-SOLO', mathId, 'solo_kid');

    expect(await studentService.listLinkedStudentIds(soloId, centerId)).toEqual([soloId]);
    await studentRepository.remove(soloId, reasonId, centerId);
    expect(await record(soloId)).toMatchObject({ deleted: true, username: 'solo_kid', main_student_id: null });
  });
});
