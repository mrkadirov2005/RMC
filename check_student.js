const pool = require('./service/src/db/pool');

async function checkStudent() {
  try {
    const result = await pool.query("SELECT * FROM students WHERE first_name LIKE 'Abduqodirov%' OR last_name LIKE 'Abduqodirov%'");
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkStudent();
