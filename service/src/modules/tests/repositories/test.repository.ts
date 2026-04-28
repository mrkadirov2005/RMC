const pool = require('../../../db/pool');

// Safely serialize a value to a JSONB-compatible string for pg
const toJsonb = (val: any): string | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    // Already a JSON string - validate and return
    try { JSON.parse(val); return val; } catch { /* fall through to stringify */ }
  }
  return JSON.stringify(val);
};

const findAll = async (conditions: string[] = [], params: any[] = []) => {
  let query = 'SELECT * FROM tests';
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const findById = async (id: number, centerId?: number) => {
  const params: any[] = [Number(id)];
  let query = 'SELECT * FROM tests WHERE test_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(Number(centerId));
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const insertTest = async (params: any[], db: any = pool) => {
  const result = await db.query(
    `INSERT INTO tests (
      center_id, subject_id, test_name, test_type, description, instructions,
      total_marks, passing_marks, duration_minutes, assignment_type, is_timed,
      shuffle_questions, show_results_immediately, allow_retake, max_retakes,
      test_data, created_by, created_by_type, is_active, is_private, start_date, end_date
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
    ) RETURNING *`,
    params.map((val, idx) => {
      if ([0, 1, 6, 7, 8, 14, 16].includes(idx) && val !== null) return Number(val);
      if (idx === 15) return toJsonb(val) ?? JSON.stringify({}); // test_data JSONB
      return val;
    })
  );
  return result.rows[0];
};

const updateTest = async (params: any[], id: number, centerId?: number) => {
  const values = [...params, Number(id)];
  let query = `UPDATE tests SET
      subject_id = COALESCE($1, subject_id),
      test_name = COALESCE($2, test_name),
      test_type = COALESCE($3, test_type),
      description = COALESCE($4, description),
      instructions = COALESCE($5, instructions),
      total_marks = COALESCE($6, total_marks),
      passing_marks = COALESCE($7, passing_marks),
      duration_minutes = COALESCE($8, duration_minutes),
      assignment_type = COALESCE($9, assignment_type),
      is_timed = COALESCE($10, is_timed),
      shuffle_questions = COALESCE($11, shuffle_questions),
      show_results_immediately = COALESCE($12, show_results_immediately),
      allow_retake = COALESCE($13, allow_retake),
      max_retakes = COALESCE($14, max_retakes),
      test_data = COALESCE($15, test_data),
      is_active = COALESCE($16, is_active),
      is_private = COALESCE($17, is_private),
      start_date = COALESCE($18, start_date),
      end_date = COALESCE($19, end_date),
      updated_at = CURRENT_TIMESTAMP
     WHERE test_id = $20`;
  if (centerId) {
    values.push(Number(centerId));
    query += ' AND center_id = $21';
  }
  query += ' RETURNING *';
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const deleteTest = async (id: number, centerId?: number) => {
  const params: any[] = [Number(id)];
  let query = 'DELETE FROM tests WHERE test_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(Number(centerId));
  }
  query += ' RETURNING *';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const findQuestionsByTest = async (testId: number, centerId?: number) => {
  const params: any[] = [Number(testId)];
  let query = 'SELECT * FROM test_questions WHERE test_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(Number(centerId));
  }
  query += ' ORDER BY question_order, question_id';
  const result = await pool.query(query, params);
  return result.rows;
};

const findPassagesByTest = async (testId: number, centerId?: number) => {
  const params: any[] = [Number(testId)];
  let query = 'SELECT * FROM reading_passages WHERE test_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(Number(centerId));
  }
  query += ' ORDER BY passage_order, passage_id';
  const result = await pool.query(query, params);
  return result.rows;
};

const insertQuestion = async (params: any[], db: any = pool) => {
  const result = await db.query(
    `INSERT INTO test_questions (
      center_id, test_id, passage_id, question_text, question_type, marks, negative_marks,
      question_order, options, correct_answer, explanation, image_url,
      is_required, word_limit
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    params.map((val, idx) => {
      if ([0, 1, 2, 5, 6, 7].includes(idx) && val !== null) return Number(val);
      if (idx === 8 || idx === 9) return toJsonb(val); // options, correct_answer JSONB
      return val;
    })
  );
  return result.rows[0];
};

const updateQuestion = async (params: any[], questionId: number, centerId?: number) => {
  const values = [...params, Number(questionId)];
  let query = `UPDATE test_questions SET
      test_id = COALESCE($1, test_id),
      passage_id = COALESCE($2, passage_id),
      question_text = COALESCE($3, question_text),
      question_type = COALESCE($4, question_type),
      marks = COALESCE($5, marks),
      negative_marks = COALESCE($6, negative_marks),
      question_order = COALESCE($7, question_order),
      options = COALESCE($8, options),
      correct_answer = COALESCE($9, correct_answer),
      explanation = COALESCE($10, explanation),
      image_url = COALESCE($11, image_url),
      is_required = COALESCE($12, is_required),
      word_limit = COALESCE($13, word_limit)
     WHERE question_id = $14`;
  if (centerId) {
    values.push(Number(centerId));
    query += ' AND center_id = $15';
  }
  query += ' RETURNING *';
  // Stringify JSONB fields: options is index 7 (0-based), correct_answer is index 8
  const safeValues = values.map((val, idx) => {
    if (idx === 7 || idx === 8) return toJsonb(val);
    return val;
  });
  const result = await pool.query(query, safeValues);
  return result.rows[0] || null;
};

const deleteQuestion = async (id: number, centerId?: number) => {
  const params: any[] = [Number(id)];
  let query = 'DELETE FROM test_questions WHERE question_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(Number(centerId));
  }
  query += ' RETURNING *';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const insertPassage = async (params: any[], db: any = pool) => {
  const result = await db.query(
    `INSERT INTO reading_passages (
      center_id, test_id, title, content, word_count, difficulty_level, passage_order,
      audio_url, image_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    params.map((val, idx) => ([0, 1, 4, 6].includes(idx) && val !== null ? Number(val) : val))
  );
  return result.rows[0];
};


const updatePassage = async (params: any[], passageId: number, centerId?: number) => {
  const values = [...params, passageId];
  let query = `UPDATE reading_passages SET
      test_id = COALESCE($1, test_id),
      title = COALESCE($2, title),
      content = COALESCE($3, content),
      word_count = COALESCE($4, word_count),
      difficulty_level = COALESCE($5, difficulty_level),
      passage_order = COALESCE($6, passage_order),
      audio_url = COALESCE($7, audio_url),
      image_url = COALESCE($8, image_url)
     WHERE passage_id = $9`;
  if (centerId) {
    values.push(centerId);
    query += ' AND center_id = $10';
  }
  query += ' RETURNING *';
  const result = await pool.query(
    query,
    values
  );
  return result.rows[0] || null;
};

const deletePassage = async (id: number, centerId?: number) => {
  const params: any[] = [id];
  let query = 'DELETE FROM reading_passages WHERE passage_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const findSubmissionById = async (id: number, centerId?: number) => {
  const params: any[] = [id];
  let query = 'SELECT * FROM test_submissions WHERE submission_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const findSubmissionsByTest = async (testId: number, centerId?: number) => {
  const params: any[] = [testId];
  let query = 'SELECT * FROM test_submissions WHERE test_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const findSubmissionsByStudent = async (studentId: number, centerId?: number) => {
  const params: any[] = [studentId];
  let query = 'SELECT * FROM test_submissions WHERE student_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const insertSubmission = async (params: any[]) => {
  const result = await pool.query(
    `INSERT INTO test_submissions (
      center_id, test_id, student_id, started_at, submitted_at, time_taken_seconds, submission_data,
      total_score, obtained_marks, percentage, status, is_passed, feedback,
      graded_by, graded_by_type, graded_at, attempt_number, ip_address
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
    params
  );
  return result.rows[0];
};

const updateSubmission = async (params: any[], submissionId: number, centerId?: number) => {
  const values = [...params, submissionId];
  let query = `UPDATE test_submissions SET
      submitted_at = COALESCE($1, submitted_at),
      time_taken_seconds = COALESCE($2, time_taken_seconds),
      submission_data = COALESCE($3, submission_data),
      total_score = COALESCE($4, total_score),
      obtained_marks = COALESCE($5, obtained_marks),
      percentage = COALESCE($6, percentage),
      status = COALESCE($7, status),
      is_passed = COALESCE($8, is_passed),
      feedback = COALESCE($9, feedback),
      graded_by = COALESCE($10, graded_by),
      graded_by_type = COALESCE($11, graded_by_type),
      graded_at = COALESCE($12, graded_at),
      attempt_number = COALESCE($13, attempt_number),
      ip_address = COALESCE($14, ip_address),
      updated_at = CURRENT_TIMESTAMP
     WHERE submission_id = $15`;
  if (centerId) {
    values.push(centerId);
    query += ' AND center_id = $16';
  }
  query += ' RETURNING *';
  const result = await pool.query(
    query,
    values
  );
  return result.rows[0] || null;
};

const findAnswersBySubmission = async (submissionId: number, centerId?: number) => {
  const params: any[] = [submissionId];
  let query = 'SELECT * FROM test_answers WHERE submission_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' ORDER BY answer_id';
  const result = await pool.query(query, params);
  return result.rows;
};

const deleteAnswersBySubmission = async (submissionId: number, centerId?: number) => {
  const params: any[] = [submissionId];
  let query = 'DELETE FROM test_answers WHERE submission_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  await pool.query(query, params);
};

const insertAnswer = async (params: any[]) => {
  const result = await pool.query(
    `INSERT INTO test_answers (
      center_id, submission_id, question_id, student_answer, is_correct, marks_obtained,
      feedback, graded, graded_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    params
  );
  return result.rows[0];
};

const findResultsByTest = async (testId: number, centerId?: number) => {
  const params: any[] = [testId];
  let query = 'SELECT * FROM test_results_summary WHERE test_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' ORDER BY best_score DESC NULLS LAST, average_score DESC NULLS LAST';
  const result = await pool.query(query, params);
  return result.rows;
};

const findResultsByStudent = async (studentId: number, centerId?: number) => {
  const params: any[] = [studentId];
  let query = (
    `SELECT trs.*, t.test_name, t.test_type, t.total_marks, t.passing_marks
     FROM test_results_summary trs
     JOIN tests t ON t.test_id = trs.test_id
     WHERE trs.student_id = $1`
  );
  if (centerId) {
    query += ' AND trs.center_id = $2';
    params.push(centerId);
  }
  query += ' ORDER BY trs.updated_at DESC, trs.created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const findResultByStudent = async (testId: number, studentId: number, centerId?: number) => {
  const params: any[] = [testId, studentId];
  let query = 'SELECT * FROM test_results_summary WHERE test_id = $1 AND student_id = $2';
  if (centerId) {
    query += ' AND center_id = $3';
    params.push(centerId);
  }
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const upsertResult = async (params: any[]) => {
  const result = await pool.query(
    `INSERT INTO test_results_summary (
      center_id, test_id, student_id, best_score, average_score, total_attempts,
      last_attempt_at, first_passed_at, is_completed, certificate_issued
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (test_id, student_id)
    DO UPDATE SET
      best_score = EXCLUDED.best_score,
      average_score = EXCLUDED.average_score,
      total_attempts = EXCLUDED.total_attempts,
      last_attempt_at = EXCLUDED.last_attempt_at,
      first_passed_at = COALESCE(test_results_summary.first_passed_at, EXCLUDED.first_passed_at),
      is_completed = EXCLUDED.is_completed,
      certificate_issued = EXCLUDED.certificate_issued,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    params
  );
  return result.rows[0];
};

const findAssignedTests = async (type: string, id: number, centerId?: number) => {
  let query: string;
  if (type === 'student') {
    const queryParams: any[] = [type, id];
    let centerCond = '';
    if (centerId) {
      queryParams.push(centerId);
      centerCond = ` AND t.center_id = $${queryParams.length} `;
    }

    query = `
      SELECT DISTINCT ON (t.test_id)
        t.*, 
        ta.assigned_to_type, 
        ta.assigned_to_id, 
        ta.assigned_by, 
        ta.assigned_at, 
        ta.due_date, 
        COALESCE(ta.is_mandatory, t.assignment_type = 'all_students') as is_mandatory,
        ta.notes
      FROM tests t
      LEFT JOIN test_assignments ta ON ta.test_id = t.test_id
      LEFT JOIN students s ON s.student_id = $2
      WHERE t.is_active = true
      ${centerCond}
      AND (
        COALESCE(t.is_private, false) = false
        OR (COALESCE(t.is_private, false) = true AND t.created_by = s.teacher_id)
      )
      ORDER BY t.test_id, ta.assigned_at DESC NULLS LAST
    `;
    const result = await pool.query(query, queryParams);
    return result.rows;
  } else {
    const queryParams: any[] = [type, id];
    let centerCond = '';
    if (centerId) {
      queryParams.push(centerId);
      centerCond = ` AND ta.center_id = $${queryParams.length}`;
    }

    query = `
      SELECT t.*, ta.assigned_to_type, ta.assigned_to_id, ta.assigned_by, ta.assigned_at, ta.due_date, ta.is_mandatory, ta.notes
      FROM tests t
      JOIN test_assignments ta ON ta.test_id = t.test_id
      WHERE ta.assigned_to_type = $1 AND ta.assigned_to_id = $2
      ${centerCond}
      ORDER BY ta.assigned_at DESC
    `;
    const result = await pool.query(query, queryParams);
    return result.rows;
  }
};



const insertAssignment = async (params: any[]) => {
  const result = await pool.query(
    `INSERT INTO test_assignments (
      center_id, test_id, assigned_to_type, assigned_to_id, assigned_by, due_date, is_mandatory, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    params
  );
  return result.rows[0];
};

const deleteAssignmentsByTest = async (testId: number, centerId?: number) => {
  const params: any[] = [testId];
  let query = 'DELETE FROM test_assignments WHERE test_id = $1';
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  await pool.query(query, params);
};

const getQuestionsByIds = async (questionIds: number[], centerId?: number) => {
  if (questionIds.length === 0) return [];
  const params: any[] = [questionIds];
  let query = `SELECT * FROM test_questions WHERE question_id = ANY($1::int[])`;
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' ORDER BY question_order, question_id';
  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = {
  findAll,
  findById,
  insertTest,
  updateTest,
  deleteTest,
  findQuestionsByTest,
  findPassagesByTest,
  insertQuestion,
  updateQuestion,
  deleteQuestion,
  insertPassage,
  updatePassage,
  deletePassage,
  findSubmissionById,
  findSubmissionsByTest,
  findSubmissionsByStudent,
  insertSubmission,
  updateSubmission,
  findAnswersBySubmission,
  deleteAnswersBySubmission,
  insertAnswer,
  findResultsByTest,
  findResultsByStudent,
  findResultByStudent,
  upsertResult,
  findAssignedTests,
  insertAssignment,
  deleteAssignmentsByTest,
  getQuestionsByIds,
};

export { };
