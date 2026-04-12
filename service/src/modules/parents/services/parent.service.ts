const { hashPassword } = require('../../../shared/password');
const parentRepository = require('../repositories/parent.repository');
const { studentInCenter } = require('../../../shared/tenantDb');

const listParents = (centerId?: number) => parentRepository.findAllSafe(centerId);

const getParent = (id: number, centerId?: number) => parentRepository.findByIdSafe(id, centerId);

const createParent = (body: any) => {
  const { first_name, last_name, email, phone, username, password, status } = body;
  if (!first_name || !last_name || !username || !password) {
    return { error: 'validation' as const };
  }
  const password_hash = hashPassword(password);
  return parentRepository
    .insert([first_name, last_name, email || null, phone || null, username, password_hash, status || 'Active'])
    .then((row: any) => ({ row }));
};

const updateParent = (id: number, body: any, centerId?: number) => {
  const { first_name, last_name, email, phone, status } = body;
  return parentRepository.update(id, [first_name, last_name, email, phone, status], centerId);
};

const deleteParent = (id: number, centerId?: number) => parentRepository.remove(id, centerId);

const assignStudent = async (body: any, centerId?: number) => {
  const { parent_id, student_id, relationship, is_primary } = body;
  if (!parent_id || !student_id) return { error: 'validation' as const };
  if (centerId) {
    const ok = await studentInCenter(Number(student_id), Number(centerId));
    if (!ok) return { error: 'invalid_center' as const };
  }
  return parentRepository
    .upsertParentStudent([parent_id, student_id, relationship || 'Guardian', is_primary || false])
    .then(() => ({ ok: true as const }));
};

const authenticate = async (username: string, password: string) => {
  const parent = await parentRepository.findByUsernameLogin(username);
  if (!parent) return { kind: 'invalid' as const };
  if (parent.status !== 'Active') return { kind: 'inactive' as const };
  if (hashPassword(password) !== parent.password_hash) return { kind: 'invalid' as const };
  return { kind: 'ok' as const, parent };
};

const getMyStudents = (parentId: number) => parentRepository.findStudentsForParent(parentId);

const getMyStudentPayments = (parentId: number) => parentRepository.findPaymentsForParent(parentId);

const getMyStudentAttendance = (parentId: number) => parentRepository.findAttendanceForParent(parentId);

const getMyStudentGrades = (parentId: number) => parentRepository.findGradesForParent(parentId);

const getMyStudentTests = (parentId: number) => parentRepository.findTestSubmissionsForParent(parentId);

module.exports = {
  listParents,
  getParent,
  createParent,
  updateParent,
  deleteParent,
  assignStudent,
  authenticate,
  getMyStudents,
  getMyStudentPayments,
  getMyStudentAttendance,
  getMyStudentGrades,
  getMyStudentTests,
};

export {};
