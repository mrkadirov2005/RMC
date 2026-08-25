const { sql } = require('drizzle-orm');
const salaryRepository = require('../repositories/salary.repository');
const teacherService = require('../../teachers/services/teacher.service');
const ownerService = require('../../owners/services/owner.service');
const superuserService = require('../../superusers/services/superuser.service');

const getPreviousPeriod = () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
};

const getOverview = async ({ centerId, year, month }: { centerId?: number; year?: number; month?: number }) => {
  const period = year && month ? { year: Number(year), month: Number(month) } : getPreviousPeriod();
  const teachersOverview = await salaryRepository.listTeacherOverview({
    centerId,
    year: period.year,
    month: period.month,
  });
  return { year: period.year, month: period.month, teachers: teachersOverview };
};

const getTeacherDetail = async ({
  teacherId,
  centerId,
  months = 6,
}: {
  teacherId: number;
  centerId?: number;
  months?: number;
}) => {
  const teacher = await teacherService.getTeacher(teacherId, centerId);
  if (!teacher) return null;
  const history = await salaryRepository.listHistoryForTeacher(teacherId, centerId, months);
  return {
    teacher: {
      teacher_id: teacher.teacher_id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
    },
    history,
  };
};

// The acting user's JWT id is polymorphic: for an owner it points at a row in `owners`,
// for everyone else it points at a row in `superusers` — see owner.controller.ts's login.
const resolveActingUserIdentity = async (actingUser: any, centerId?: number) => {
  const role = String(actingUser?.role || '').toLowerCase();
  let row: any = null;
  if (role === 'owner') {
    row = await ownerService.getOwner(Number(actingUser?.id));
  } else {
    row = await superuserService.getSuperuser(Number(actingUser?.id), centerId ?? null);
  }
  const name =
    [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim() ||
    row?.username ||
    actingUser?.username ||
    'Unknown';
  return {
    markedById: Number(actingUser?.id) || null,
    markedByUserType: actingUser?.userType || null,
    markedByRole: actingUser?.role || null,
    markedByName: name,
  };
};

const markPaid = async (payload: {
  teacherId: number;
  salaryYear: number;
  salaryMonth: number;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  centerId?: number;
  actingUser: any;
}) => {
  const identity = await resolveActingUserIdentity(payload.actingUser, payload.centerId);
  return salaryRepository.upsertRecord({
    teacherId: payload.teacherId,
    centerId: payload.centerId ?? null,
    salaryYear: payload.salaryYear,
    salaryMonth: payload.salaryMonth,
    amount: payload.amount,
    isPaid: true,
    ...identity,
    paymentMethod: payload.paymentMethod ?? null,
    notes: payload.notes ?? null,
  });
};

const updateSalaryRecord = async (payload: {
  id: number;
  patch: { amount?: number; is_paid?: boolean; payment_method?: string; notes?: string };
  centerId?: number;
  actingUser: any;
}) => {
  const identity = await resolveActingUserIdentity(payload.actingUser, payload.centerId);
  const patch: any = { ...identity };
  if (payload.patch.amount !== undefined) patch.amount = payload.patch.amount;
  if (payload.patch.is_paid !== undefined) {
    patch.isPaid = payload.patch.is_paid;
    patch.paidAt = payload.patch.is_paid ? sql`CURRENT_TIMESTAMP` : null;
  }
  if (payload.patch.payment_method !== undefined) patch.paymentMethod = payload.patch.payment_method;
  if (payload.patch.notes !== undefined) patch.notes = payload.patch.notes;
  return salaryRepository.updateRecord(payload.id, patch, payload.centerId);
};

module.exports = {
  getOverview,
  getTeacherDetail,
  markPaid,
  updateSalaryRecord,
};

export {};
