const paymentPlanRepository = require('../repositories/payment_plan.repository');
const { studentInCenter } = require('../../../shared/tenantDb');

const list = (query: { student_id?: string; center_id?: string; status?: string }, centerId?: number) => {
  const params: any[] = [];
  const conditions: string[] = [];
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  if (query.student_id) {
    params.push(query.student_id);
    conditions.push(`student_id = $${params.length}`);
  }
  if (scopedCenterId) {
    params.push(scopedCenterId);
    conditions.push(`center_id = $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    conditions.push(`status = $${params.length}`);
  }
  return paymentPlanRepository.findAllFiltered(conditions, params);
};

const getWithInstallments = async (id: number, centerId?: number) => {
  const plan = await paymentPlanRepository.findPlanById(id, centerId);
  if (!plan) return null;
  const installments = await paymentPlanRepository.findInstallments(id);
  return { ...plan, installments };
};

const create = async (body: any, centerId?: number) => {
  const { student_id, center_id, name, total_amount, currency, start_date, end_date, installments = [] } = body;
  const scopedCenterId = centerId ?? center_id;
  if (!student_id || !scopedCenterId || !name || !total_amount || !start_date) {
    return { error: 'validation' as const };
  }
  if (!(await studentInCenter(Number(student_id), Number(scopedCenterId)))) {
    return { error: 'invalid_center' as const };
  }
  const plan = await paymentPlanRepository.insertPlan([
    student_id,
    scopedCenterId,
    name,
    total_amount,
    currency || 'USD',
    start_date,
    end_date || null,
  ]);
  for (const installment of installments) {
    await paymentPlanRepository.insertInstallmentSimple(plan.plan_id, installment.due_date, installment.amount);
  }
  return { plan };
};

const update = async (id: number, body: any, centerId?: number) => {
  const { name, total_amount, currency, start_date, end_date, status, installments } = body;
  const row = await paymentPlanRepository.updatePlan(id, [name, total_amount, currency, start_date, end_date, status], centerId);
  if (!row) return null;

  if (Array.isArray(installments)) {
    await paymentPlanRepository.deleteInstallmentsByPlan(id);
    for (const installment of installments) {
      await paymentPlanRepository.insertInstallment(id, installment.due_date, installment.amount, installment.status);
    }
  }
  return row;
};

const remove = (id: number, centerId?: number) => paymentPlanRepository.deletePlan(id, centerId);

module.exports = { list, getWithInstallments, create, update, remove };

export {};
