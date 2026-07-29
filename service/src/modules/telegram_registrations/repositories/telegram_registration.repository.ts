const { and, desc, eq, ne, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { students, telegramStudentRegistrations } = require('../../../db/schema');

const db = pool.db;

const registrationSelection = {
  registration_id: telegramStudentRegistrations.registrationId,
  telegram_user_id: telegramStudentRegistrations.telegramUserId,
  telegram_chat_id: telegramStudentRegistrations.telegramChatId,
  telegram_username: telegramStudentRegistrations.telegramUsername,
  first_name: telegramStudentRegistrations.firstName,
  last_name: telegramStudentRegistrations.lastName,
  phone: telegramStudentRegistrations.phone,
  date_of_birth: telegramStudentRegistrations.dateOfBirth,
  parent_name: telegramStudentRegistrations.parentName,
  parent_phone: telegramStudentRegistrations.parentPhone,
  gender: telegramStudentRegistrations.gender,
  username: telegramStudentRegistrations.username,
  password_hash: telegramStudentRegistrations.passwordHash,
  school_name: telegramStudentRegistrations.schoolName,
  school_class: telegramStudentRegistrations.schoolClass,
  center_id: telegramStudentRegistrations.centerId,
  class_label: telegramStudentRegistrations.classLabel,
  status: telegramStudentRegistrations.status,
  converted_student_id: telegramStudentRegistrations.convertedStudentId,
  converted_at: telegramStudentRegistrations.convertedAt,
  created_at: telegramStudentRegistrations.createdAt,
  updated_at: telegramStudentRegistrations.updatedAt,
};

const studentSelection = {
  student_id: students.studentId,
  center_id: students.centerId,
  enrollment_number: students.enrollmentNumber,
  first_name: students.firstName,
  last_name: students.lastName,
  username: students.username,
  password_hash: students.passwordHash,
  email: students.email,
  phone: students.phone,
  date_of_birth: students.dateOfBirth,
  parent_name: students.parentName,
  parent_phone: students.parentPhone,
  gender: students.gender,
  status: students.status,
  teacher_id: students.teacherId,
  class_id: students.classId,
  school_name: students.schoolName,
  school_class: students.schoolClass,
  is_frozen: students.isFrozen,
  created_at: students.createdAt,
  updated_at: students.updatedAt,
};

const ensureTable = () =>
  db.execute(sql`
    CREATE TABLE IF NOT EXISTS telegram_student_registrations (
      registration_id SERIAL PRIMARY KEY,
      telegram_user_id BIGINT NOT NULL,
      telegram_chat_id BIGINT NOT NULL,
      telegram_username VARCHAR(100),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30),
      date_of_birth DATE,
      parent_name VARCHAR(200),
      parent_phone VARCHAR(30),
      gender VARCHAR(20),
      username VARCHAR(100),
      password_hash VARCHAR(255),
      school_name VARCHAR(200),
      school_class VARCHAR(50),
      center_id INT,
      class_label VARCHAR(100) NOT NULL DEFAULT 'Unassigned',
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      converted_student_id INT,
      converted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

const list = async (centerId?: number, status?: string) => {
  await ensureTable();
  const conditions: any[] = [];
  if (centerId) conditions.push(eq(telegramStudentRegistrations.centerId, centerId));
  if (status) conditions.push(eq(telegramStudentRegistrations.status, status));
  const query: any = db
    .select({
      ...registrationSelection,
      converted_enrollment_number: students.enrollmentNumber,
      converted_first_name: students.firstName,
      converted_last_name: students.lastName,
    })
    .from(telegramStudentRegistrations)
    .leftJoin(students, eq(students.studentId, telegramStudentRegistrations.convertedStudentId));

  return (conditions.length ? query.where(and(...conditions)) : query).orderBy(
    desc(telegramStudentRegistrations.createdAt),
    desc(telegramStudentRegistrations.registrationId)
  );
};

const convertToStudent = async (id: number, centerId?: number, assignData?: { class_id?: number; teacher_id?: number }) => {
  await ensureTable();
  return db.transaction(async (tx: any) => {
    const rows = await tx
      .select(registrationSelection)
      .from(telegramStudentRegistrations)
      .where(eq(telegramStudentRegistrations.registrationId, id))
      .limit(1);
    const registration = rows[0];
    if (!registration) return { error: 'not_found' as const };
    if (centerId && Number(registration.center_id) !== Number(centerId)) return { error: 'not_found' as const };
    if (registration.converted_student_id || String(registration.status || '').toLowerCase() === 'imported') {
      return { error: 'already_imported' as const, registration };
    }

    const targetCenterId = centerId || registration.center_id;
    if (!targetCenterId) return { error: 'center_required' as const };

    const enrollmentNumber = `TG-${String(id).padStart(6, '0')}`;
    const inserted = await tx
      .insert(students)
      .values({
        centerId: targetCenterId,
        enrollmentNumber,
        firstName: registration.first_name,
        lastName: registration.last_name,
        username: registration.username,
        passwordHash: registration.password_hash,
        email: null,
        phone: registration.phone,
        dateOfBirth: registration.date_of_birth,
        parentName: registration.parent_name,
        parentPhone: registration.parent_phone,
        gender: registration.gender,
        status: 'Active',
        teacherId: assignData?.teacher_id || null,
        classId: assignData?.class_id || null,
        schoolName: registration.school_name,
        schoolClass: registration.school_class,
        isFrozen: false,
      })
      .returning(studentSelection);
    const student = inserted[0];

    const updated = await tx
      .update(telegramStudentRegistrations)
      .set({
        status: 'Imported',
        convertedStudentId: student.student_id,
        convertedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(telegramStudentRegistrations.registrationId, id))
      .returning(registrationSelection);

    return { registration: updated[0], student };
  });
};

const remove = async (id: number, centerId?: number) => {
  await ensureTable();
  const conditions = [eq(telegramStudentRegistrations.registrationId, id), ne(telegramStudentRegistrations.status, 'Imported')];
  if (centerId) conditions.push(eq(telegramStudentRegistrations.centerId, centerId));
  const rows = await db
    .update(telegramStudentRegistrations)
    .set({ status: 'Rejected', updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...conditions))
    .returning(registrationSelection);
  return rows[0] || null;
};

module.exports = { list, convertToStudent, remove };

export {};
