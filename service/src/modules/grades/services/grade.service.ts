const gradeRepository = require('../repositories/grade.repository');
const { studentInCenter, classInCenter } = require('../../../shared/tenantDb');

const listGrades = (centerId?: number, teacherId?: number, studentId?: number) =>
  gradeRepository.findAll(centerId, teacherId, studentId);

const getGrade = (id: number, centerId?: number, teacherId?: number) => gradeRepository.findById(id, centerId, teacherId);

const createGrade = async (body: any, centerId?: number) => {
  const { student_id, teacher_id, subject, class_id, marks_obtained, total_marks, percentage, grade_letter, academic_year, term } = body;
  if (centerId) {
    const [studentOk, classOk] = await Promise.all([
      studentInCenter(student_id, centerId),
      classInCenter(class_id, centerId),
    ]);
    if (!studentOk || !classOk) return { error: 'invalid_center' as const };
  }
  return gradeRepository.insert([
    student_id,
    teacher_id,
    subject,
    class_id,
    marks_obtained,
    total_marks || 100,
    percentage,
    grade_letter,
    academic_year,
    term,
    centerId ?? body.center_id,
  ]);
};

const updateGrade = (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { marks_obtained, percentage, grade_letter } = body;
  return gradeRepository.update(id, [marks_obtained, percentage, grade_letter], centerId, teacherId);
};

const listByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  gradeRepository.findByStudent(studentId, centerId, teacherId);

const deleteGrade = (id: number, centerId?: number, teacherId?: number) => gradeRepository.remove(id, centerId, teacherId);

const createBulk = async (grades: any[], centerId?: number) => {
  const results: any[] = [];
  for (const g of grades) {
    const row = await createGrade(g, centerId);
    results.push(row);
  }
  return results;
};

module.exports = {
  listGrades,
  getGrade,
  createGrade,
  updateGrade,
  listByStudent,
  deleteGrade,
  createBulk,
};

export {};
