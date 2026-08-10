const classRepository = require('../repositories/class.repository');
const sessionRepository = require('../../sessions/repositories/session.repository');

const listClasses = (centerId?: number, teacherId?: number) => classRepository.findAll(centerId, teacherId);

const listClassesPaginated = (filters: Record<string, unknown>, centerId?: number, teacherId?: number) =>
  classRepository.findPaginated(filters, centerId, teacherId);

const getClass = (id: number, centerId?: number, teacherId?: number) => classRepository.findById(id, centerId, teacherId);

const generateClassCode = () => `CLS-${Date.now().toString(36).toUpperCase()}`;

const createClass = async (body: any, centerId?: number) => {
  const { center_id, class_name, subject_id, class_code, level, section, capacity, teacher_id, room_number, start_date, end_date, payment_amount, payment_frequency } = body;
  const resolvedCenterId = centerId || center_id;
  let validatedTeacherId = teacher_id || null;
  if (teacher_id) {
    const ok = await classRepository.teacherExists(teacher_id, resolvedCenterId);
    if (!ok) return { error: 'bad_teacher' as const };
  }
  if (!subject_id || !await classRepository.subjectCanAssign(Number(subject_id), Number(resolvedCenterId))) {
    return { error: 'bad_subject' as const };
  }
  const row = await classRepository.insert([
    resolvedCenterId,
    class_name,
    String(class_code || '').trim() || generateClassCode(),
    level,
    section,
    capacity,
    validatedTeacherId,
    room_number,
    start_date || null,
    end_date || null,
    payment_amount,
    payment_frequency || 'Monthly',
    Number(subject_id),
  ]);
  return { row };
};

const updateClass = async (id: number, body: any, centerId?: number) => {
  const { class_name, subject_id, class_code, level, section, capacity, teacher_id, room_number, start_date, end_date, payment_amount } = body;
  if (subject_id !== undefined && centerId && !await classRepository.subjectCanAssign(Number(subject_id), centerId, id)) {
    return { error: 'bad_subject' as const };
  }
  return classRepository.update(
    id,
    [
      class_name,
      class_code ? String(class_code).trim() : undefined,
      level,
      section,
      capacity,
      teacher_id,
      room_number,
      start_date === undefined ? undefined : start_date || null,
      end_date === undefined ? undefined : end_date || null,
      payment_amount,
      subject_id === undefined ? undefined : Number(subject_id),
    ],
    centerId
  );
};

const deleteClass = async (id: number, centerId?: number, options?: { force?: boolean }) => {
  const row = await classRepository.remove(id, centerId);
  if (!row) return { row };
  const deletedSessionCount = await sessionRepository.softDeleteByClass(id, centerId);
  return { row, deletedSessionCount };
};

const purgeClass = async (id: number, centerId?: number) => {
  const row = await classRepository.purge(id, centerId);
  return { row };
};

module.exports = { listClasses, listClassesPaginated, getClass, createClass, updateClass, deleteClass, purgeClass };

export {};
