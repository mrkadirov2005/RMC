describe('calendar projection with PostgreSQL', () => {
  let pool;
  let calendar;
  let centerId;
  let hiddenCenterId;
  let teacherId;
  let otherTeacherId;
  let classId;
  let otherClassId;
  let studentId;
  let sessionId;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query("INSERT INTO edu_centers (center_name,center_code) VALUES ('Calendar Center','CAL-A') RETURNING center_id")).rows[0].center_id;
    hiddenCenterId = (await pool.query("INSERT INTO edu_centers (center_name,center_code) VALUES ('Hidden Calendar','CAL-X') RETURNING center_id")).rows[0].center_id;
    teacherId = (await pool.query("INSERT INTO teachers (center_id,employee_id,first_name,last_name) VALUES ($1,'CAL-T1','Ada','Teacher') RETURNING teacher_id", [centerId])).rows[0].teacher_id;
    otherTeacherId = (await pool.query("INSERT INTO teachers (center_id,employee_id,first_name,last_name) VALUES ($1,'CAL-T2','Grace','Teacher') RETURNING teacher_id", [centerId])).rows[0].teacher_id;
    classId = (await pool.query("INSERT INTO classes (center_id,class_name,class_code,teacher_id) VALUES ($1,'Calendar B1','CAL-C1',$2) RETURNING class_id", [centerId, teacherId])).rows[0].class_id;
    otherClassId = (await pool.query("INSERT INTO classes (center_id,class_name,class_code,teacher_id) VALUES ($1,'Hidden Group','CAL-C2',$2) RETURNING class_id", [centerId, otherTeacherId])).rows[0].class_id;
    await pool.query("INSERT INTO classes (center_id,class_name,class_code) VALUES ($1,'Other Center Group','CAL-X1')", [hiddenCenterId]);
    await pool.query("INSERT INTO subjects (center_id,class_id,subject_name,teacher_id) VALUES ($1,$2,'English',$3)", [centerId, classId, teacherId]);
    const physicalRoomId = (await pool.query("INSERT INTO physical_rooms (center_id,name) VALUES ($1,'Calendar Room') RETURNING physical_room_id", [centerId])).rows[0].physical_room_id;
    await pool.query("INSERT INTO rooms (center_id,room_number,physical_room_id,class_id,day,time,end_time) VALUES ($1,'Calendar Room',$2,$3,'Monday','09:00','10:00')", [centerId, physicalRoomId, classId]);
    await pool.query("INSERT INTO rooms (center_id,room_number,class_id,day,time,end_time) VALUES ($1,'Other Room',$2,'Monday','11:00','12:00')", [centerId, otherClassId]);
    studentId = (await pool.query("INSERT INTO students (center_id,enrollment_number,first_name,last_name,class_id,teacher_id,status) VALUES ($1,'CAL-S1','One','Student',$2,$3,'Active') RETURNING student_id", [centerId, classId, teacherId])).rows[0].student_id;
    await pool.query("INSERT INTO students (center_id,enrollment_number,first_name,last_name,class_id,teacher_id,status) VALUES ($1,'CAL-S2','Two','Student',$2,$3,'Active')", [centerId, classId, teacherId]);
    sessionId = (await pool.query("INSERT INTO sessions (center_id,class_id,teacher_id,session_date,start_time,duration_minutes,end_time) VALUES ($1,$2,$3,'2026-08-10','09:15',30,'09:45') RETURNING session_id", [centerId, classId, teacherId])).rows[0].session_id;
    await pool.query("INSERT INTO attendance (center_id,student_id,teacher_id,class_id,session_id,attendance_date,status) VALUES ($1,$2,$3,$4,$5,'2026-08-10','Present')", [centerId, studentId, teacherId, classId, sessionId]);
    calendar = require('../../../src/modules/calendar/services/calendar.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  test('an overlapping dated session replaces its recurring occurrence and summarizes attendance', async () => {
    const query = { from: '2026-08-10', to: '2026-08-10' };
    const rows = await calendar.events(centerId, query);
    expect(rows.filter(row => row.class_id === classId)).toEqual([
      expect.objectContaining({ event_id: `session-${sessionId}`, source: 'session', status: 'in_progress', attendance: { present: 1, absent: 0, unmarked: 1 } }),
    ]);
    await expect(calendar.summary(centerId, query)).resolves.toMatchObject({ total: 2, planned: 1, in_progress: 1, attendance_missing: 1 });
  });

  test('teacher and student scopes cannot see unrelated groups or another center', async () => {
    const query = { from: '2026-08-10', to: '2026-08-10' };
    const teacherRows = await calendar.events(centerId, query, { teacherId });
    expect(teacherRows).toHaveLength(1);
    expect(teacherRows.every(row => row.teacher_id === teacherId && row.class_id === classId)).toBe(true);

    const classIds = await calendar.studentClassIds(centerId, studentId);
    expect(classIds).toEqual([classId]);
    const studentRows = await calendar.events(centerId, query, { classIds });
    expect(studentRows.every(row => row.class_id === classId)).toBe(true);
    expect(JSON.stringify(studentRows)).not.toContain('Other Center Group');
    await expect(calendar.events(centerId, query, { classIds: [] })).resolves.toEqual([]);
  });

  test('resource projection is role scoped', async () => {
    const teacherResources = await calendar.resources(centerId, {}, { teacherId });
    expect(teacherResources.filter(row => row.type === 'teacher')).toEqual([
      expect.objectContaining({ id: String(teacherId), name: 'Ada Teacher' }),
    ]);
    const studentResources = await calendar.resources(centerId, {}, { classIds: [classId] });
    expect(studentResources.filter(row => row.type === 'class')).toEqual([
      expect.objectContaining({ id: String(classId), name: 'Calendar B1' }),
    ]);
  });
});
