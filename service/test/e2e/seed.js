const crypto = require('crypto');
const { Pool } = require('pg');

const database = process.env.TEST_DB_NAME || 'crm_frontend_e2e_test';
if (!/^crm_[a-z0-9_]*e2e_test$/i.test(database)) {
  throw new Error(`Refusing to reset a database that is not E2E-only: ${database}`);
}

const password = 'E2ePass123!';
const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
const allPermissions = [
  'CRUD_STUDENT', 'CRUD_TEACHER', 'CRUD_CLASS', 'CRUD_ROOM', 'CRUD_PAYMENT',
  'CRUD_GRADE', 'CRUD_ATTENDANCE', 'CRUD_ASSIGNMENT', 'CRUD_SUBJECT', 'CRUD_DEBT',
  'CRUD_CENTER', 'VIEW_FINANCE', 'MANAGE_TESTS', 'VIEW_REPORTS', 'MANAGE_USERS',
];

async function main() {
  process.env.TEST_DB_NAME = database;
  await require('../integration/globalSetup')();

  const pool = new Pool({
    host: process.env.TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.TEST_DB_PORT || 5432),
    user: process.env.TEST_DB_USER || 'crm_user',
    password: process.env.TEST_DB_PASSWORD || 'crm_password',
    database,
  });

  try {
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    const centerA = (await pool.query(
      `INSERT INTO edu_centers (center_name, center_code, city) VALUES ('E2E Center A', 'E2E-A', 'Tashkent') RETURNING center_id`
    )).rows[0].center_id;
    await pool.query(
      `INSERT INTO edu_centers (center_name, center_code, city) VALUES ('E2E Center B', 'E2E-B', 'Samarkand')`
    );
    await pool.query(
      `INSERT INTO owners (username, email, password_hash, first_name, last_name, status)
       VALUES ('e2e_owner', 'owner@e2e.test', $1, 'E2E', 'Owner', 'Active')`,
      [passwordHash]
    );
    await pool.query(
      `INSERT INTO superusers (center_id, username, email, password_hash, first_name, last_name, role, permissions, status)
       VALUES ($1, 'e2e_admin', 'admin@e2e.test', $2, 'E2E', 'Admin', 'admin', $3::jsonb, 'Active')`,
      [centerA, passwordHash, JSON.stringify(allPermissions)]
    );
    await pool.query(
      `INSERT INTO superusers (center_id, username, password_hash, first_name, last_name, role, permissions, status)
       VALUES ($1, 'e2e_limited', $2, 'Limited', 'Admin', 'admin', '["CRUD_STUDENT"]'::jsonb, 'Active')`,
      [centerA, passwordHash]
    );
    const teacher = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name, username, password_hash, email, status, salary_percentage)
       VALUES ($1, 'E2E-T-001', 'E2E', 'Teacher', 'e2e_teacher', $2, 'teacher@e2e.test', 'Active', 50)
       RETURNING teacher_id`,
      [centerA, passwordHash]
    )).rows[0].teacher_id;
    const klass = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, capacity, payment_amount, payment_frequency, start_date, end_date)
       VALUES ($1, 'E2E Class A', 'E2E-CLASS-A', $2, 20, 1000000, 'Monthly', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months')
       RETURNING class_id`,
      [centerA, teacher]
    )).rows[0].class_id;
    await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, status, teacher_id, class_id, is_frozen)
       VALUES
       ($1, 'E2E-S-001', 'E2E', 'Student', 'e2e_student', $2, 'student@e2e.test', '+998900000001', 'Active', $3, $4, false),
       ($1, 'E2E-S-002', 'Frozen', 'Student', 'e2e_frozen', $2, 'frozen@e2e.test', '+998900000002', 'Active', $3, $4, true)`,
      [centerA, passwordHash, teacher, klass]
    );
    await pool.query(
      `INSERT INTO teacher_payment_credentials (teacher_id, password_hash, is_active)
       VALUES ($1, $2, true)`,
      [teacher, passwordHash]
    );
    console.log(`[e2e] Seeded ${database}; shared password: ${password}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
