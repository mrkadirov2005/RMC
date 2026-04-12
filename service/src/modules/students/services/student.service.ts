const { hashPassword } = require('../../../shared/password');
const studentRepository = require('../repositories/student.repository');
const studentCoinsRepository = require('../repositories/studentCoins.repository');

const listStudents = (centerId?: number, teacherId?: number) => studentRepository.findAllWithClass(centerId, teacherId);

const getStudent = (id: number, centerId?: number, teacherId?: number) =>
  studentRepository.findByIdWithClass(id, centerId, teacherId);

const createStudent = (body: any) => {
  const password_hash = body.password ? hashPassword(body.password) : null;
  return studentRepository.insert({
    center_id: body.center_id,
    enrollment_number: body.enrollment_number,
    first_name: body.first_name,
    last_name: body.last_name,
    username: body.username,
    password_hash,
    email: body.email,
    phone: body.phone,
    date_of_birth: body.date_of_birth,
    parent_name: body.parent_name,
    parent_phone: body.parent_phone,
    gender: body.gender,
    status: body.status,
    teacher_id: body.teacher_id,
    class_id: body.class_id,
  });
};

const updateStudent = (id: number, body: any, centerId?: number, teacherId?: number) =>
  studentRepository.update(id, body, centerId, teacherId);

const deleteStudent = (id: number, centerId?: number, teacherId?: number) =>
  studentRepository.remove(id, centerId, teacherId);

const authenticate = async (username: string, password: string) => {
  const student = await studentRepository.findByUsername(username);
  if (!student) return { kind: 'invalid' as const };
  if (student.status !== 'Active') return { kind: 'inactive' as const };
  if (hashPassword(password) !== student.password_hash) return { kind: 'invalid' as const };
  return { kind: 'ok' as const, student };
};

const setPasswordByAdmin = (id: number, username: string, password: string, centerId?: number, teacherId?: number) => {
  const password_hash = hashPassword(password);
  return studentRepository.setCredentials(id, username, password_hash, centerId, teacherId);
};

const changePassword = async (id: number, old_password: string, new_password: string) => {
  const existing = await studentRepository.findPasswordHashById(id);
  if (existing == null) return { ok: false as const, reason: 'not_found' as const };
  if (hashPassword(old_password) !== existing) return { ok: false as const, reason: 'bad_old' as const };
  await studentRepository.updatePasswordHash(id, hashPassword(new_password));
  return { ok: true as const };
};

module.exports = {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  authenticate,
  setPasswordByAdmin,
  changePassword,
  getCoinSummary: async (studentId: number, centerId?: number, teacherId?: number) => {
    const student = await studentRepository.findByIdWithClass(studentId, centerId, teacherId);
    if (!student) return null;
    const transactions = await studentCoinsRepository.listTransactions(studentId, centerId, teacherId);
    return { balance: Number(student.coins || 0), transactions };
  },
  addCoins: (studentId: number, delta: number, reason: string | null, createdBy: number | null, createdByType: string | null) =>
    studentCoinsRepository.addTransaction(studentId, delta, reason, createdBy, createdByType),
  updateCoinTransaction: (studentId: number, transactionId: number, delta: number, reason: string | null) =>
    studentCoinsRepository.updateTransaction(studentId, transactionId, delta, reason),
  deleteCoinTransaction: (studentId: number, transactionId: number) =>
    studentCoinsRepository.deleteTransaction(studentId, transactionId),
};

export {};
