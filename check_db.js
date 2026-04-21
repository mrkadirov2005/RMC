const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'crm_password', // Based on dbcon default, but I found 12345678 in .env
  database: 'crm_db',
});

// Overriding with .env values
const pool2 = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345678',
  database: 'crm_db',
});

async function check() {
  try {
    const name = 'Abduqodirov';
    const studentsRes = await pool2.query(
      "SELECT student_id, first_name, last_name, class_id, center_id, coins FROM students WHERE first_name LIKE $1 OR last_name LIKE $1",
      [`%${name}%`]
    );
    console.log('--- STUDENTS ---');
    console.log(JSON.stringify(studentsRes.rows, null, 2));

    if (studentsRes.rows.length > 0) {
      const sid = studentsRes.rows[0].student_id;
      
      const attendanceRes = await pool2.query("SELECT COUNT(*) FROM attendance WHERE student_id = $1", [sid]);
      const gradesRes = await pool2.query("SELECT COUNT(*) FROM grades WHERE student_id = $1", [sid]);
      const testsRes = await pool2.query("SELECT COUNT(*) FROM test_assigned_students WHERE student_id = $1", [sid]);
      const debtsRes = await pool2.query("SELECT SUM(debt_amount - amount_paid) as total FROM debts WHERE student_id = $1", [sid]);

      console.log('--- STATS FOR STUDENT ID', sid, '---');
      console.log('Attendance records:', attendanceRes.rows[0].count);
      console.log('Grade records:', gradesRes.rows[0].count);
      console.log('Assigned tests:', testsRes.rows[0].count);
      console.log('Outstanding debt:', debtsRes.rows[0].total);
    }
    await pool2.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
