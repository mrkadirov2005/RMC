const pool = require('../../../db/pool');

const bulkInsert = async (rows: any[]) => {
  if (rows.length === 0) return { created: 0 };

  const values: any[] = [];
  const placeholders = rows.map((row, index) => {
    const base = index * 7;
    values.push(
      row.center_id,
      row.class_id,
      row.teacher_id,
      row.session_date,
      row.start_time,
      row.duration_minutes,
      row.end_time
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });

  const query = `
    INSERT INTO sessions (center_id, class_id, teacher_id, session_date, start_time, duration_minutes, end_time)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (class_id, session_date, start_time) DO NOTHING
    RETURNING session_id
  `;

  const result = await pool.query(query, values);
  return { created: result.rowCount || 0 };
};

const findByClass = async (classId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT * FROM sessions WHERE class_id = $1';
  const params: any[] = [classId];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }
  query += ' ORDER BY session_date, start_time';
  const result = await pool.query(query, params);
  return result.rows;
};

const deleteUpcoming = async (classId: number, fromDate: string, toDate?: string, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM sessions WHERE class_id = $1 AND session_date >= $2';
  const params: any[] = [classId, fromDate];

  if (toDate) {
    params.push(toDate);
    query += ` AND session_date <= $${params.length}`;
  }
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }

  query += ' RETURNING session_id';
  const result = await pool.query(query, params);
  return { deleted: result.rowCount || 0 };
};

const deleteById = async (classId: number, sessionId: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM sessions WHERE session_id = $1 AND class_id = $2';
  const params: any[] = [sessionId, classId];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }
  query += ' RETURNING session_id';
  const result = await pool.query(query, params);
  return { deleted: result.rowCount || 0 };
};

const create = async (row: any) => {
  const query = `
    INSERT INTO sessions (center_id, class_id, teacher_id, session_date, start_time, duration_minutes, end_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (class_id, session_date, start_time) 
    DO UPDATE SET 
      teacher_id = EXCLUDED.teacher_id,
      duration_minutes = EXCLUDED.duration_minutes,
      end_time = EXCLUDED.end_time,
      center_id = EXCLUDED.center_id
    RETURNING *
  `;
  const values = [
    row.center_id,
    row.class_id,
    row.teacher_id,
    row.session_date,
    row.start_time,
    row.duration_minutes,
    row.end_time
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = { create, bulkInsert, findByClass, deleteUpcoming, deleteById };


export {};
