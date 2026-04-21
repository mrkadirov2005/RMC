const subjectRepository = require('../repositories/subject.repository');
const { classInCenter } = require('../../../shared/tenantDb');

const listSubjects = (centerId?: number, teacherId?: number) => subjectRepository.findAll(centerId, teacherId);

const getSubject = (id: number, centerId?: number, teacherId?: number) => subjectRepository.findById(id, centerId, teacherId);

const listByClass = (classId: number, centerId?: number, teacherId?: number) =>
  subjectRepository.findByClass(classId, centerId, teacherId);

const createSubject = async (body: any, centerId?: number) => {
  const { class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks } = body;
  const resolvedCenterId = centerId ?? body.center_id;
  if (resolvedCenterId) {
    const ok = await classInCenter(class_id, resolvedCenterId);
    if (!ok) return { error: 'invalid_center' as const };
  }
  return subjectRepository.insert([
    resolvedCenterId,
    class_id,
    subject_name,
    subject_code,
    teacher_id,
    total_marks || 100,
    passing_marks || 40,
  ]);
};

const updateSubject = (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { subject_name, subject_code, teacher_id, total_marks, passing_marks } = body;
  return subjectRepository.update(id, [subject_name, subject_code, teacher_id, total_marks, passing_marks], centerId, teacherId);
};

const deleteSubject = (id: number, centerId?: number, teacherId?: number) => subjectRepository.remove(id, centerId, teacherId);

module.exports = {
  listSubjects,
  getSubject,
  listByClass,
  createSubject,
  updateSubject,
  deleteSubject,
};

export {};
