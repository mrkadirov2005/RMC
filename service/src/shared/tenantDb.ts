const { and, eq, isNull, sql } = require('drizzle-orm');
const pool = require('../db/pool');
const { classes, students, superusers, teachers, tests } = require('../db/schema');

const db = pool.db;

const studentBelongsToTeacher = async (studentId: number, teacherId: number) => {
  const rows = await db
    .select({ student_id: students.studentId })
    .from(students)
    .leftJoin(classes, and(eq(classes.classId, students.classId), isNull(classes.deletedAt)))
    .where(and(eq(students.studentId, studentId), sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${teacherId}`, isNull(students.deletedAt)))
    .limit(1);
  return rows.length > 0;
};

const studentInCenter = async (studentId: number, centerId: number) => {
  const rows = await db
    .select({ student_id: students.studentId })
    .from(students)
    .where(and(eq(students.studentId, studentId), eq(students.centerId, centerId), isNull(students.deletedAt)))
    .limit(1);
  return rows.length > 0;
};

const classInCenter = async (classId: number, centerId: number) => {
  const rows = await db
    .select({ class_id: classes.classId })
    .from(classes)
    .where(and(eq(classes.classId, classId), eq(classes.centerId, centerId), isNull(classes.deletedAt)))
    .limit(1);
  return rows.length > 0;
};

const classBelongsToTeacher = async (classId: number, teacherId: number) => {
  const rows = await db
    .select({ class_id: classes.classId })
    .from(classes)
    .where(and(eq(classes.classId, classId), eq(classes.teacherId, teacherId), isNull(classes.deletedAt)))
    .limit(1);
  return rows.length > 0;
};

const testInCenter = async (testId: number, centerId: number) => {
  const rows = await db.select({ test_id: tests.testId }).from(tests).where(and(eq(tests.testId, testId), eq(tests.centerId, centerId))).limit(1);
  return rows.length > 0;
};

const teacherInCenter = async (teacherId: number, centerId: number) => {
  const rows = await db
    .select({ teacher_id: teachers.teacherId })
    .from(teachers)
    .where(and(eq(teachers.teacherId, teacherId), eq(teachers.centerId, centerId), isNull(teachers.deletedAt)))
    .limit(1);
  return rows.length > 0;
};

const superuserInCenter = async (superuserId: number, centerId: number) => {
  const rows = await db
    .select({ superuser_id: superusers.superuserId })
    .from(superusers)
    .where(and(eq(superusers.superuserId, superuserId), eq(superusers.centerId, centerId)))
    .limit(1);
  return rows.length > 0;
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
