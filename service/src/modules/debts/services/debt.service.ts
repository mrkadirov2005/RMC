const debtRepository = require('../repositories/debt.repository');

const listDebts = (centerId?: number, teacherId?: number) => debtRepository.findAll(centerId, teacherId);

const getDebt = (id: number, centerId?: number, teacherId?: number) => debtRepository.findById(id, centerId, teacherId);

const createDebt = (body: any) => {
  const { student_id, center_id, debt_amount, debt_date, due_date, amount_paid, remarks } = body;
  const paid = amount_paid ?? 0;
  const balance = Number(debt_amount) - Number(paid);
  return debtRepository.insert([student_id, center_id, debt_amount, debt_date, due_date, paid, balance, remarks]);
};

const updateDebt = async (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { amount_paid, remarks } = body;
  const current = await debtRepository.findAmounts(id);
  if (!current) return null;
  const newAmountPaid =
    amount_paid !== undefined && amount_paid !== null ? Number(amount_paid) : Number(current.amount_paid);
  const balance = Number(current.debt_amount) - newAmountPaid;
  return debtRepository.updatePaid(id, newAmountPaid, balance, remarks, centerId, teacherId);
};

const listByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  debtRepository.findByStudent(studentId, centerId, teacherId);

const deleteDebt = (id: number, centerId?: number, teacherId?: number) => debtRepository.remove(id, centerId, teacherId);

const analyzeUnpaidMonths = async (center_id?: string, start_date?: string, end_date?: string, teacherId?: number) => {
  const students = await debtRepository.findActiveStudents(center_id, teacherId);
  const endDate = end_date ? new Date(end_date) : new Date();
  const startDate = start_date ? new Date(start_date) : new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);

  const monthsToCheck: { year: number; month: number; label: string }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    monthsToCheck.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      label: current.toLocaleString('default', { month: 'long', year: 'numeric' }),
    });
    current.setMonth(current.getMonth() + 1);
  }

  const analysisResults: any[] = [];

  for (const student of students) {
    const payments = await debtRepository.findPaymentsForStudentInRange(student.student_id, startDate, endDate);
    const paidMonths = new Set<string>();
    payments.forEach((p: any) => {
      const date = new Date(p.payment_date);
      paidMonths.add(`${date.getFullYear()}-${date.getMonth() + 1}`);
    });

    const unpaidMonths = monthsToCheck.filter((m) => !paidMonths.has(`${m.year}-${m.month}`));
    const debtsResult = await debtRepository.findOpenDebtsForStudent(student.student_id);
    const totalDebt = debtsResult.reduce((sum: number, d: any) => sum + parseFloat(d.balance || 0), 0);

    if (unpaidMonths.length > 0 || totalDebt > 0) {
      analysisResults.push({
        student_id: student.student_id,
        student_name: `${student.first_name} ${student.last_name}`,
        enrollment_number: student.enrollment_number,
        center_id: student.center_id,
        unpaid_months: unpaidMonths,
        unpaid_months_count: unpaidMonths.length,
        total_payments: payments.length,
        existing_debts: debtsResult,
        total_debt_balance: totalDebt,
      });
    }
  }

  analysisResults.sort((a, b) => b.unpaid_months_count - a.unpaid_months_count);

  return {
    analysis_period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      months_analyzed: monthsToCheck.length,
    },
    summary: {
      total_students_analyzed: students.length,
      students_with_unpaid_months: analysisResults.length,
      total_unpaid_instances: analysisResults.reduce((sum, r) => sum + r.unpaid_months_count, 0),
    },
    results: analysisResults,
  };
};

const generateDebtsFromAnalysis = async (
  student_ids: number[],
  monthly_fee: number,
  center_id?: number,
  remarks?: string,
  teacherId?: number
) => {
  const createdDebts: any[] = [];
  const today = new Date();

  for (const studentId of student_ids) {
    let studentCenter = center_id;
    if (!studentCenter) {
      studentCenter = await debtRepository.getStudentCenter(studentId);
    }

    if (studentCenter) {
      if (teacherId) {
        const student = await debtRepository.findByStudent(studentId, studentCenter, teacherId);
        if (!student || student.length === 0) {
          continue;
        }
      }
      const row = await debtRepository.insert([
        studentId,
        studentCenter,
        monthly_fee,
        today,
        new Date(today.getFullYear(), today.getMonth() + 1, 15),
        0,
        monthly_fee,
        remarks || 'Generated from unpaid months analysis',
      ]);
      createdDebts.push(row);
    }
  }

  return { createdDebts };
};

const getPaymentSummary = async (studentId: number) => {
  const monthly_payments = await debtRepository.paymentMonthlySummary(studentId);
  const debt_summary = (await debtRepository.debtAggregate(studentId)) || { total_debt: 0, total_paid: 0, total_balance: 0 };
  return { monthly_payments, debt_summary };
};

module.exports = {
  listDebts,
  getDebt,
  createDebt,
  updateDebt,
  listByStudent,
  deleteDebt,
  analyzeUnpaidMonths,
  generateDebtsFromAnalysis,
  getPaymentSummary,
};

export {};
