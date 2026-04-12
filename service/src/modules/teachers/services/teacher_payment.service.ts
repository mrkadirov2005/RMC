const { hashPassword } = require('../../../shared/password');
const teacherRepository = require('../repositories/teacher.repository');
const paymentCredentialRepository = require('../repositories/teacher_payment.repository');

const setPaymentPassword = async (teacherId: number, password: string, updatedBy?: number) => {
  const passwordHash = hashPassword(password);
  return paymentCredentialRepository.upsertPassword(teacherId, passwordHash, updatedBy);
};

const authenticatePaymentAccess = async (username: string, password: string) => {
  const teacher = await teacherRepository.findByUsername(username);
  if (!teacher) return { kind: 'invalid' as const };
  if (teacher.status !== 'Active') return { kind: 'inactive' as const };

  const creds = await paymentCredentialRepository.findByTeacherId(teacher.teacher_id);
  if (!creds || !creds.is_active) return { kind: 'invalid' as const };

  if (hashPassword(password) !== creds.password_hash) return { kind: 'invalid' as const };
  await paymentCredentialRepository.markUsed(teacher.teacher_id);
  return { kind: 'ok' as const, teacher };
};

module.exports = {
  setPaymentPassword,
  authenticatePaymentAccess,
};

export {};
