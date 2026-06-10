const classRepository = require('../repositories/class.repository');
const sessionRepository = require('../../sessions/repositories/session.repository');

const listClasses = (centerId?: number, teacherId?: number) => classRepository.findAll(centerId, teacherId);

const getClass = (id: number, centerId?: number, teacherId?: number) => classRepository.findById(id, centerId, teacherId);

const createClass = async (body: any, centerId?: number) => {
  const { center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency } = body;
  let validatedTeacherId = teacher_id || null;
  if (teacher_id) {
    const ok = await classRepository.teacherExists(teacher_id, centerId || center_id);
    if (!ok) return { error: 'bad_teacher' as const };
  }
  const row = await classRepository.insert([
    centerId || center_id,
    class_name,
    class_code,
    level,
    section,
    capacity,
    validatedTeacherId,
    room_number,
    payment_amount,
    payment_frequency || 'Monthly',
  ]);
  return { row };
};

const updateClass = (id: number, body: any, centerId?: number) => {
  const { class_name, level, section, capacity, teacher_id, room_number, payment_amount } = body;
  return classRepository.update(id, [class_name, level, section, capacity, teacher_id, room_number, payment_amount], centerId);
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

module.exports = { listClasses, getClass, createClass, updateClass, deleteClass, purgeClass };

export {};
