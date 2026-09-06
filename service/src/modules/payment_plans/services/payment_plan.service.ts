const paymentPlanRepository = require('../repositories/payment_plan.repository');
const { studentInCenter } = require('../../../shared/tenantDb');

const list = (query: { student_id?: string; center_id?: string; status?: string }, centerId?: number) => {
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  return paymentPlanRepository.findAllFiltered({
    studentId: query.student_id ? Number(query.student_id) : undefined,
    centerId: scopedCenterId,
    status: query.status,
  });
};

const getWithInstallments = async (id: number, centerId?: number) => {
  const plan = await paymentPlanRepository.findPlanById(id, centerId);
  if (!plan) return null;
  const installments = await paymentPlanRepository.findInstallments(id);
  return { ...plan, installments };
};

const installmentsSumMatches = (totalAmount: any, installments: any[]) => {
  if (!Array.isArray(installments) || installments.length === 0) return true;
  const sum = installments.reduce((acc, installment) => acc + Number(installment.amount || 0), 0);
  return Math.abs(Number(totalAmount || 0) - sum) < 0.01;
};

const create = async (body: any, centerId?: number) => {
  const { student_id, center_id, name, total_amount, currency, start_date, end_date, installments = [] } = body;
  const scopedCenterId = centerId ?? center_id;
  if (!(await studentInCenter(Number(student_id), Number(scopedCenterId)))) {
    return { error: 'invalid_center' as const };
  }
  if (!installmentsSumMatches(total_amount, installments)) {
    return { error: 'installment_sum_mismatch' as const };
  }
  return paymentPlanRepository.withTransaction(async (client: any) => {
    const plan = await paymentPlanRepository.insertPlan(
      [student_id, scopedCenterId, name, total_amount, currency || 'UZS', start_date, end_date || null],
      client
    );
    for (const installment of installments) {
      await paymentPlanRepository.insertInstallmentSimple(plan.plan_id, installment.due_date, installment.amount, client);
    }
    return { plan };
  });
};

const update = async (id: number, body: any, centerId?: number) => {
  const { name, total_amount, currency, start_date, end_date, status, installments } = body;

  if (Array.isArray(installments)) {
    const existing = await paymentPlanRepository.findPlanById(id, centerId);
    if (!existing) return null;
    const effectiveTotal = total_amount ?? existing.total_amount;
    if (!installmentsSumMatches(effectiveTotal, installments)) {
      return { error: 'installment_sum_mismatch' as const };
    }
  }

  return paymentPlanRepository.withTransaction(async (client: any) => {
    const row = await paymentPlanRepository.updatePlan(id, [name, total_amount, currency, start_date, end_date, status], centerId, client);
    if (!row) return null;

    if (Array.isArray(installments)) {
      await paymentPlanRepository.deleteInstallmentsByPlan(id, client);
      for (const installment of installments) {
        await paymentPlanRepository.insertInstallment(id, installment.due_date, installment.amount, installment.status, client);
      }
    }
    return row;
  });
};

const remove = (id: number, centerId?: number) => paymentPlanRepository.deletePlan(id, centerId);

module.exports = { list, getWithInstallments, create, update, remove };

export {};
