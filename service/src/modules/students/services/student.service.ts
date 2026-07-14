const { hashPassword } = require('../../../shared/password');
const studentRepository = require('../repositories/student.repository');
const studentCoinsRepository = require('../repositories/studentCoins.repository');
const discountService = require('../../discounts/services/discount.service');

const listStudents = (centerId?: number, teacherId?: number) => studentRepository.findAllWithClass(centerId, teacherId);

const listStudentsPaginated = (filters: Record<string, unknown>, centerId?: number, teacherId?: number) =>
  studentRepository.findPaginatedWithClass(filters, centerId, teacherId);

const getStudent = (id: number, centerId?: number, teacherId?: number) =>
  studentRepository.findByIdWithClass(id, centerId, teacherId);

const listDeletedStudents = (centerId?: number) =>
  studentRepository.findDeletedWithClassAndTeacher(centerId);

const listClassStudentsWithTransfers = (classId: number, centerId?: number, teacherId?: number) =>
  studentRepository.findByClassIncludingTransferred(classId, centerId, teacherId);

const syncStudentDiscount = async (student: any, body: any, centerId?: number) => {
  const studentId = Number(student?.student_id || student?.id || body.student_id || 0);
  const scopedCenterId = Number(student?.center_id || body.center_id || centerId || 0);
  if (!studentId || !scopedCenterId || body.is_discounted === undefined) return;

  const discountKind = body.discount_kind || 'serial_discount';
  const activeDiscount = await discountService.getActiveByStudent(studentId, scopedCenterId, discountKind);
  if (!body.is_discounted) {
    for (const kind of ['serial_discount', 'monthly_discount']) {
      const row = await discountService.getActiveByStudent(studentId, scopedCenterId, kind);
      if (row?.discount_id) await discountService.update(row.discount_id, { active: false }, scopedCenterId);
    }
    return;
  }

  if (body.discount_value == null) return;
  const originalPrice = Number(body.discount_original_price || body.original_price || activeDiscount?.original_price || 0);
  const valueType = body.discount_value_type || activeDiscount?.discount_type || 'fixed';
  const value = Number(body.discount_value || 0);
  const calculated = discountService.calculateDiscount(originalPrice, valueType, value);
  const payload = {
    student_id: studentId,
    center_id: scopedCenterId,
    discount_type: valueType,
    discount_kind: discountKind,
    value,
    original_price: originalPrice,
    final_price: calculated.finalAmount,
    reason: body.discount_reason || activeDiscount?.reason || null,
    active: true,
  };

  if (activeDiscount?.discount_id) {
    await discountService.update(activeDiscount.discount_id, payload, scopedCenterId);
  } else {
    await discountService.create(payload, scopedCenterId);
  }

  const otherKind = discountKind === 'serial_discount' ? 'monthly_discount' : 'serial_discount';
  const staleDiscount = await discountService.getActiveByStudent(studentId, scopedCenterId, otherKind);
  if (staleDiscount?.discount_id) await discountService.update(staleDiscount.discount_id, { active: false }, scopedCenterId);
};

const createStudent = async (body: any) => {
  const password_hash = body.password ? hashPassword(body.password) : null;
  const student = await studentRepository.insert({
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
    school_name: body.school_name,
    school_class: body.school_class,
    is_frozen: body.is_frozen,
  });
  await syncStudentDiscount(student, body);
  return student;
};

const updateStudent = async (id: number, body: any, centerId?: number, teacherId?: number) => {
  const student = await studentRepository.update(id, body, centerId, teacherId);
  if (student) await syncStudentDiscount(student, body, centerId);
  return student;
};

const deleteStudent = (id: number, centerId?: number, teacherId?: number) =>
  studentRepository.remove(id, centerId, teacherId);

const purgeStudent = (id: number, centerId?: number, teacherId?: number) =>
  studentRepository.purge(id, centerId, teacherId);

const transferStudent = (id: number, targetClassId: number, centerId?: number, teacherId?: number) =>
  studentRepository.transferToClass(id, targetClassId, centerId, teacherId);

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
  listStudentsPaginated,
  getStudent,
  listDeletedStudents,
  listClassStudentsWithTransfers,
  createStudent,
  updateStudent,
  deleteStudent,
  purgeStudent,
  transferStudent,
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
  upsertSourceCoins: (
    studentId: number,
    delta: number,
    reason: string | null,
    sourceType: string,
    sourceId: number,
    createdBy: number | null,
    createdByType: string | null
  ) => studentCoinsRepository.upsertSourceTransaction(studentId, delta, reason, sourceType, sourceId, createdBy, createdByType),
  updateCoinTransaction: (studentId: number, transactionId: number, delta: number, reason: string | null) =>
    studentCoinsRepository.updateTransaction(studentId, transactionId, delta, reason),
  deleteCoinTransaction: (studentId: number, transactionId: number) =>
    studentCoinsRepository.deleteTransaction(studentId, transactionId),
};

export {};
