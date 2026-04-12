const pool = require('../db/pool');

const studentBelongsToTeacher = async (studentId: number, teacherId: number) => {
  const result = await pool.query(
    'SELECT student_id FROM students WHERE student_id = $1 AND teacher_id = $2',
    [studentId, teacherId]
  );
  return result.rows.length > 0;
};

const studentInCenter = async (studentId: number, centerId: number) => {
  const result = await pool.query('SELECT student_id FROM students WHERE student_id = $1 AND center_id = $2', [
    studentId,
    centerId,
  ]);
  return result.rows.length > 0;
};

const classInCenter = async (classId: number, centerId: number) => {
  const result = await pool.query('SELECT class_id FROM classes WHERE class_id = $1 AND center_id = $2', [
    classId,
    centerId,
  ]);
  return result.rows.length > 0;
};

const classBelongsToTeacher = async (classId: number, teacherId: number) => {
  const result = await pool.query('SELECT class_id FROM classes WHERE class_id = $1 AND teacher_id = $2', [
    classId,
    teacherId,
  ]);
  return result.rows.length > 0;
};

const testInCenter = async (testId: number, centerId: number) => {
  const result = await pool.query('SELECT test_id FROM tests WHERE test_id = $1 AND center_id = $2', [
    testId,
    centerId,
  ]);
  return result.rows.length > 0;
};

const teacherInCenter = async (teacherId: number, centerId: number) => {
  const result = await pool.query('SELECT teacher_id FROM teachers WHERE teacher_id = $1 AND center_id = $2', [
    teacherId,
    centerId,
  ]);
  return result.rows.length > 0;
};

const superuserInCenter = async (superuserId: number, centerId: number) => {
  const result = await pool.query('SELECT superuser_id FROM superusers WHERE superuser_id = $1 AND center_id = $2', [
    superuserId,
    centerId,
  ]);
  return result.rows.length > 0;
};

module.exports = {
  studentBelongsToTeacher,
  studentInCenter,
  classInCenter,
  classBelongsToTeacher,
  testInCenter,
  teacherInCenter,
  superuserInCenter,
};

export {};
