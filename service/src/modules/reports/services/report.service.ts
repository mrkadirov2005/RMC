const reportRepository = require('../repositories/report.repository');

const buildDateRange = (start_date?: string, end_date?: string) => {
  const start = start_date ? new Date(start_date) : null;
  const end = end_date ? new Date(end_date) : null;
  return { start, end };
};

const overview = async (query: { center_id?: string; start_date?: string; end_date?: string }, centerId?: number) => {
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  const { start_date, end_date } = query;
  const { start, end } = buildDateRange(start_date, end_date);

  const params: any[] = [];
  const centerFilter = scopedCenterId ? `WHERE center_id = $${params.length + 1}` : '';
  if (scopedCenterId) params.push(scopedCenterId);

  const students = await reportRepository.countStudents(centerFilter, params);
  const teachers = await reportRepository.countTeachers(centerFilter, params);
  const classes = await reportRepository.countClasses(centerFilter, params);

  const paymentsParams: any[] = [];
  let paymentsWhere = `WHERE payment_status = 'Completed'`;
  if (scopedCenterId) {
    paymentsParams.push(scopedCenterId);
    paymentsWhere += ` AND center_id = $${paymentsParams.length}`;
  }
  if (start) {
    paymentsParams.push(start);
    paymentsWhere += ` AND payment_date >= $${paymentsParams.length}`;
  }
  if (end) {
    paymentsParams.push(end);
    paymentsWhere += ` AND payment_date <= $${paymentsParams.length}`;
  }
  const payments = await reportRepository.sumPayments(paymentsWhere, paymentsParams);

  const debtParams: any[] = [];
  let debtWhere = 'WHERE balance > 0';
  if (scopedCenterId) {
    debtParams.push(scopedCenterId);
    debtWhere += ` AND center_id = $${debtParams.length}`;
  }
  const debts = await reportRepository.sumDebts(debtWhere, debtParams);

  return {
    students,
    teachers,
    classes,
    payments,
    debts,
    period: {
      start_date: start_date || null,
      end_date: end_date || null,
    },
  };
};

const paymentsReport = async (
  query: { center_id?: string; start_date?: string; end_date?: string; group_by?: string },
  centerId?: number
) => {
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  const { start_date, end_date, group_by } = query;
  const { start, end } = buildDateRange(start_date, end_date);

  const params: any[] = [];
  let where = `WHERE payment_status = 'Completed'`;

  if (scopedCenterId) {
    params.push(scopedCenterId);
    where += ` AND center_id = $${params.length}`;
  }
  if (start) {
    params.push(start);
    where += ` AND payment_date >= $${params.length}`;
  }
  if (end) {
    params.push(end);
    where += ` AND payment_date <= $${params.length}`;
  }

  if (group_by === 'month') {
    return { mode: 'rows' as const, rows: await reportRepository.paymentsByMonth(where, params) };
  }
  return { mode: 'single' as const, row: await reportRepository.paymentsAggregate(where, params) };
};

const attendanceReport = async (query: { class_id?: string; start_date?: string; end_date?: string }, centerId?: number) => {
  const { class_id, start_date, end_date } = query;
  const { start, end } = buildDateRange(start_date, end_date);

  const params: any[] = [];
  let where = 'WHERE 1=1';

  if (centerId) {
    params.push(centerId);
    where += ` AND center_id = $${params.length}`;
  }
  if (class_id) {
    params.push(class_id);
    where += ` AND class_id = $${params.length}`;
  }
  if (start) {
    params.push(start);
    where += ` AND attendance_date >= $${params.length}`;
  }
  if (end) {
    params.push(end);
    where += ` AND attendance_date <= $${params.length}`;
  }

  return reportRepository.attendanceByStatus(where, params);
};

module.exports = { overview, paymentsReport, attendanceReport };

export {};
