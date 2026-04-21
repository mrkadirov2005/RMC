const pool = require('./service/src/db/pool');

async function check() {
  try {
    const name = 'Abduqodirov';
    const studentsRes = await pool.query(
      "SELECT student_id, first_name, last_name, class_id, center_id, coins FROM students WHERE first_name LIKE $1 OR last_name LIKE $1",
      [`%${name}%`]
    );
    console.log('--- STUDENTS ---');
    console.log(JSON.stringify(studentsRes.rows, null, 2));

    if (studentsRes.rows.length > 0) {
      const sid = studentsRes.rows[0].student_id;
      const cid = studentsRes.rows[0].class_id;

      const attendanceRes = await pool.query("SELECT COUNT(*) FROM attendance WHERE student_id = $1", [sid]);
      const gradesRes = await pool.query("SELECT COUNT(*) FROM grades WHERE student_id = $1", [sid]);
      const testsRes = await pool.query("SELECT COUNT(*) FROM test_assigned_students WHERE student_id = $1", [sid]);
      const debtsRes = await pool.query("SELECT SUM(debt_amount - amount_paid) as total FROM debts WHERE student_id = $1", [sid]);

      console.log('--- STATS FOR STUDENT ID', sid, '---');
      console.log('Attendance records:', attendanceRes.rows[0].count);
      console.log('Grade records:', gradesRes.rows[0].count);
      console.log('Assigned tests:', testsRes.rows[0].count);
      console.log('Outstanding debt:', debtsRes.rows[0].total);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
