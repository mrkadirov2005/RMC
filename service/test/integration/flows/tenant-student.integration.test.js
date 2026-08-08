const crypto = require('crypto');
const request = require('supertest');

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

describe('actor and student center isolation with PostgreSQL', () => {
  let app;
  let server;
  let pool;
  let centerA;
  let centerB;
  let classA1;
  let classA2;
  let classB;
  let adminToken;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');

    centerA = (await pool.query(
      `INSERT INTO edu_centers (center_name, center_code) VALUES ('Center A', 'IT-A') RETURNING center_id`
    )).rows[0].center_id;
    centerB = (await pool.query(
      `INSERT INTO edu_centers (center_name, center_code) VALUES ('Center B', 'IT-B') RETURNING center_id`
    )).rows[0].center_id;

    await pool.query(
      `INSERT INTO superusers (center_id, username, password_hash, role, permissions, status)
       VALUES ($1, 'admin_a', $2, 'admin', '[]'::jsonb, 'Active')`,
      [centerA, hash('password-a')]
    );
    classA1 = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, payment_amount) VALUES ($1, 'A1', 'IT-A1', 1000) RETURNING class_id`, [centerA]
    )).rows[0].class_id;
    classA2 = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, payment_amount) VALUES ($1, 'A2', 'IT-A2', 1200) RETURNING class_id`, [centerA]
    )).rows[0].class_id;
    classB = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, payment_amount) VALUES ($1, 'B1', 'IT-B1', 900) RETURNING class_id`, [centerB]
    )).rows[0].class_id;
    await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, class_id)
       VALUES
       ($1, 'A-EXISTING', 'Alpha', 'Student', 'alpha_student', $3, $4),
       ($2, 'B-SECRET', 'Beta', 'Student', 'beta_student', $3, $5)`,
      [centerA, centerB, hash('student-password'), classA1, classB]
    );

    const { createApp } = require('../../../src/index');
    app = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });

    const login = await request(server)
      .post('/api/superusers/auth/login')
      .send({ username: 'admin_a', password: 'password-a' });
    expect(login.status).toBe(200);
    adminToken = login.body.token;
  });

  afterAll(async () => {
    if (server) {
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
    if (pool) await pool.end();
  });

  test('admin list returns only its center and never returns password hashes', async () => {
    const response = await request(server)
      .get('/api/students')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ center_id: centerA, enrollment_number: 'A-EXISTING' });
    expect(response.body[0]).not.toHaveProperty('password_hash');
    expect(JSON.stringify(response.body)).not.toContain('B-SECRET');
  });

  test('admin cannot override its center through query or header', async () => {
    for (const response of [
      await request(server).get(`/api/students?center_id=${centerB}`).set('Authorization', `Bearer ${adminToken}`),
      await request(server).get('/api/students').set('Authorization', `Bearer ${adminToken}`).set('x-center-id', String(centerB)),
    ]) {
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain('B-SECRET');
      expect(JSON.stringify(response.body)).toContain('A-EXISTING');
    }
  });

  test('guessed other-center student IDs return not found without leaking identity', async () => {
    const secretId = (await pool.query(`SELECT student_id FROM students WHERE enrollment_number = 'B-SECRET'`)).rows[0].student_id;
    const response = await request(server)
      .get(`/api/students/${secretId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain('Beta');
  });

  test('student creation replaces a client-supplied center and stores a password hash', async () => {
    const response = await request(server)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        center_id: centerB,
        enrollment_number: 'A-CREATED',
        first_name: 'Created',
        last_name: 'Student',
        username: 'created_student',
        password: 'secret12',
      });

    expect(response.status).toBe(201);
    expect(response.body).not.toHaveProperty('password_hash');
    const stored = (await pool.query(
      `SELECT center_id, password_hash FROM students WHERE enrollment_number = 'A-CREATED'`
    )).rows[0];
    expect(stored.center_id).toBe(centerA);
    expect(stored.password_hash).toBe(hash('secret12'));
  });

  test('duplicate username and enrollment return conflict without adding rows', async () => {
    const before = Number((await pool.query('SELECT COUNT(*) AS count FROM students')).rows[0].count);
    const duplicateUsername = await request(server)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enrollment_number: 'A-UNIQUE', first_name: 'X', last_name: 'Y', username: 'alpha_student' });
    expect(duplicateUsername.status).toBe(409);
    expect(duplicateUsername.body.error).toContain('Username');

    const duplicateEnrollment = await request(server)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enrollment_number: 'A-EXISTING', first_name: 'X', last_name: 'Y', username: 'unique_student' });
    expect(duplicateEnrollment.status).toBe(409);
    expect(duplicateEnrollment.body.error).toContain('Enrollment');
    const after = Number((await pool.query('SELECT COUNT(*) AS count FROM students')).rows[0].count);
    expect(after).toBe(before);
  });

  test('transfer rejects same-class and cross-center targets without mutation', async () => {
    const studentId = (await pool.query(`SELECT student_id FROM students WHERE enrollment_number = 'A-EXISTING' AND deleted_at IS NULL`)).rows[0].student_id;
    const same = await request(server).post(`/api/students/${studentId}/transfer`).set('Authorization', `Bearer ${adminToken}`).send({ target_class_id: classA1 });
    expect(same.status).toBe(400);
    const otherCenter = await request(server).post(`/api/students/${studentId}/transfer`).set('Authorization', `Bearer ${adminToken}`).send({ target_class_id: classB });
    expect(otherCenter.status).toBe(404);
    const stored = (await pool.query('SELECT class_id, deleted_at FROM students WHERE student_id = $1', [studentId])).rows[0];
    expect(stored.class_id).toBe(classA1); expect(stored.deleted_at).toBeNull();
  });

  test('transfer preserves previous class history and creates one active target membership', async () => {
    const studentId = (await pool.query(`SELECT student_id FROM students WHERE enrollment_number = 'A-EXISTING' AND deleted_at IS NULL`)).rows[0].student_id;
    const response = await request(server).post(`/api/students/${studentId}/transfer`).set('Authorization', `Bearer ${adminToken}`).send({ target_class_id: classA2 });
    expect(response.status).toBe(201);
    const rows = (await pool.query(`SELECT class_id, previous_class_id, deleted_at FROM students WHERE enrollment_number = 'A-EXISTING' ORDER BY student_id`)).rows;
    expect(rows.filter((row) => row.deleted_at == null)).toHaveLength(1);
    expect(rows.find((row) => row.deleted_at == null)).toMatchObject({ class_id: classA2, previous_class_id: classA1 });
    expect(rows.some((row) => row.deleted_at != null && row.class_id === classA1)).toBe(true);
  });

  test('soft delete hides an active student and archive restore returns it', async () => {
    const activeId = (await pool.query(`SELECT student_id FROM students WHERE enrollment_number = 'A-EXISTING' AND deleted_at IS NULL`)).rows[0].student_id;
    const deleted = await request(server).delete(`/api/students/${activeId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.status).toBe(200);
    const hidden = await request(server).get(`/api/students/${activeId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(hidden.status).toBe(404);
    const archive = await request(server).get('/api/archive').set('Authorization', `Bearer ${adminToken}`);
    expect(archive.status).toBe(200);
    expect(archive.body.students.some((row) => row.student_id === activeId)).toBe(true);
    const restored = await request(server).post(`/api/archive/students/${activeId}/restore`).set('Authorization', `Bearer ${adminToken}`);
    expect(restored.status).toBe(200);
    const visible = await request(server).get(`/api/students/${activeId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(visible.status).toBe(200);
  });
});
