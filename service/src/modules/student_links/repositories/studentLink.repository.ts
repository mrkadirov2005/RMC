const pool = require('../../../db/pool');

/** Link groups in scope with their members (current group, teacher, phones) as a JSON array. */
const findAll = async (centerId?: number) => {
  const result = await pool.query(
    `SELECT g.link_id, g.center_id, g.relation_type, g.note, g.created_by_name, g.created_at,
            COALESCE(json_agg(json_build_object(
              'student_id', s.student_id, 'first_name', s.first_name, 'last_name', s.last_name,
              'phone', s.phone, 'parent_name', s.parent_name, 'parent_phone', s.parent_phone,
              'status', s.status, 'is_deleted', s.deleted_at IS NOT NULL,
              'class_name', c.class_name,
              'teacher_name', NULLIF(trim(concat_ws(' ', t.last_name, t.first_name)), '')
            ) ORDER BY s.last_name, s.first_name) FILTER (WHERE s.student_id IS NOT NULL), '[]') AS members
     FROM student_link_groups g
     LEFT JOIN student_link_members m ON m.link_id = g.link_id
     LEFT JOIN students s ON s.student_id = m.student_id
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
     WHERE g.deleted_at IS NULL AND ($1::int IS NULL OR g.center_id = $1)
     GROUP BY g.link_id
     ORDER BY g.created_at DESC, g.link_id DESC`,
    [centerId ?? null]
  );
  return result.rows;
};

/** The branches of the given live students, limited to the caller's branch. */
const findStudentCenters = async (studentIds: number[], centerId?: number) => {
  const result = await pool.query(
    `SELECT student_id, center_id FROM students
     WHERE student_id = ANY($1::int[]) AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)`,
    [studentIds, centerId ?? null]
  );
  return result.rows;
};

/** A link group and its members, written together. */
const insert = async (row: { centerId: number; relationType: string; note: string | null; createdByName: string | null; studentIds: number[] }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const group = await client.query(
      `INSERT INTO student_link_groups (center_id, relation_type, note, created_by_name) VALUES ($1, $2, $3, $4) RETURNING link_id`,
      [row.centerId, row.relationType, row.note, row.createdByName]
    );
    const linkId = group.rows[0].link_id;
    await client.query(
      'INSERT INTO student_link_members (link_id, student_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING',
      [linkId, row.studentIds]
    );
    await client.query('COMMIT');
    return { link_id: linkId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/** Replace a group's type, note and members. Returns false when it is not in the caller's branch. */
const update = async (linkId: number, row: { relationType: string; note: string | null; studentIds: number[] }, centerId?: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const group = await client.query(
      `UPDATE student_link_groups SET relation_type = $2, note = $3
       WHERE link_id = $1 AND deleted_at IS NULL AND ($4::int IS NULL OR center_id = $4) RETURNING link_id`,
      [linkId, row.relationType, row.note, centerId ?? null]
    );
    if (group.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query('DELETE FROM student_link_members WHERE link_id = $1', [linkId]);
    await client.query('INSERT INTO student_link_members (link_id, student_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING', [linkId, row.studentIds]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const softDelete = async (linkId: number, centerId?: number) => {
  const result = await pool.query(
    `UPDATE student_link_groups SET deleted_at = CURRENT_TIMESTAMP
     WHERE link_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)`,
    [linkId, centerId ?? null]
  );
  return result.rowCount > 0;
};

module.exports = { findAll, findStudentCenters, insert, update, softDelete };
export {};
