const reportRepository = require('../repositories/report.repository');

const buildDateRange = (start_date?: string, end_date?: string) => {
  const start = start_date || null;
  const end = end_date || null;
  return { start, end };
};

const overview = async (query: { center_id?: string; start_date?: string; end_date?: string }, centerId?: number) => {
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  const { start_date, end_date } = query;
  const { start, end } = buildDateRange(start_date, end_date);

  const students = await reportRepository.countStudents(scopedCenterId);
  const teachers = await reportRepository.countTeachers(scopedCenterId);
  const classes = await reportRepository.countClasses(scopedCenterId);
  const payments = await reportRepository.sumPayments({ centerId: scopedCenterId, start, end });
  const debts = await reportRepository.sumDebts({ centerId: scopedCenterId });

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

  const filters = { centerId: scopedCenterId, start, end };

  if (group_by === 'month') {
    return { mode: 'rows' as const, rows: await reportRepository.paymentsByMonth(filters) };
  }
  return { mode: 'single' as const, row: await reportRepository.paymentsAggregate(filters) };
};

const attendanceReport = async (query: { class_id?: string; start_date?: string; end_date?: string }, centerId?: number) => {
  const { class_id, start_date, end_date } = query;
  const { start, end } = buildDateRange(start_date, end_date);

  return reportRepository.attendanceByStatus({ centerId, classId: class_id ? Number(class_id) : undefined, start, end });
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const monthKey = (date: Date) => `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;

const monthLabel = (date: Date) => date.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const parseMonth = (value?: string) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{1,2})$/);
  const now = new Date();
  if (!match) return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(year, month - 1, 1));
};

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

const monthRange = (date: Date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: dateOnly(start), end: dateOnly(end) };
};

const retentionReport = async (query: { center_id?: string; month?: string; months?: string; limit?: string; view?: string; source_id?: string; referred_by_teacher_id?: string; source_detail?: string }, centerId?: number) => {
  const scopedCenterId = centerId ?? (query.center_id ? Number(query.center_id) : undefined);
  const selectedMonth = parseMonth(query.month);
  const previousMonth = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() - 1, 1));
  const monthCount = Math.min(24, Math.max(2, Number(query.months || 6) || 6));
  const seriesStart = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() - monthCount + 1, 1));
  const seriesEnd = new Date(Date.UTC(selectedMonth.getUTCFullYear(), selectedMonth.getUTCMonth() + 1, 0));
  const currentRange = monthRange(selectedMonth);
  const previousRange = monthRange(previousMonth);

  const recentLimit = Math.min(100, Math.max(1, Number(query.limit || 30) || 30));
  const studentListLimit = 1000;

  const intake = query.view === 'intake';
  const intakeExtra = {
    sourceId: query.source_id ? Number(query.source_id) : undefined,
    referredByTeacherId: query.referred_by_teacher_id ? Number(query.referred_by_teacher_id) : undefined,
    sourceDetail: String(query.source_detail || '').trim() || undefined,
  };
  const [current, previous, seriesRows, teacherRows, classRows, deletedStudentRows] = await Promise.all([
    intake ? reportRepository.countIntakeStudents({ centerId: scopedCenterId, ...currentRange, ...intakeExtra }) : reportRepository.countDeletedStudents({ centerId: scopedCenterId, ...currentRange }),
    intake ? reportRepository.countIntakeStudents({ centerId: scopedCenterId, ...previousRange, ...intakeExtra }) : reportRepository.countDeletedStudents({ centerId: scopedCenterId, ...previousRange }),
    intake ? reportRepository.intakeStudentsByMonth({ centerId: scopedCenterId, start: dateOnly(seriesStart), end: dateOnly(seriesEnd), ...intakeExtra }) : reportRepository.deletedStudentsByMonth({ centerId: scopedCenterId, start: dateOnly(seriesStart), end: dateOnly(seriesEnd) }),
    intake ? reportRepository.intakeStudentsByTeacher({ centerId: scopedCenterId, ...currentRange, ...intakeExtra }) : reportRepository.deletedStudentsByTeacher({ centerId: scopedCenterId, ...currentRange }),
    intake ? reportRepository.intakeStudentsByClass({ centerId: scopedCenterId, ...currentRange, ...intakeExtra }) : reportRepository.deletedStudentsByClass({ centerId: scopedCenterId, ...currentRange }),
    intake ? reportRepository.recentIntakeStudents({ centerId: scopedCenterId, ...currentRange, limit: studentListLimit, ...intakeExtra }) : reportRepository.recentDeletedStudents({ centerId: scopedCenterId, ...currentRange, limit: studentListLimit }),
  ]);

  const seriesMap = new Map(seriesRows.map((row: any) => [String(row.month_start).slice(0, 7), Number(row.left_count || 0)]));
  const monthly = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(Date.UTC(seriesStart.getUTCFullYear(), seriesStart.getUTCMonth() + index, 1));
    const key = monthKey(date);
    return {
      month: key,
      label: monthLabel(date),
      left_count: seriesMap.get(key) || 0,
    };
  });

  const currentTotal = Number(current?.total || 0);
  const previousTotal = Number(previous?.total || 0);
  const delta = currentTotal - previousTotal;
  const deltaPercent = previousTotal > 0 ? Math.round((delta / previousTotal) * 1000) / 10 : currentTotal > 0 ? 100 : 0;

  return {
    view: intake ? 'intake' : 'retention',
    period: {
      selected_month: monthKey(selectedMonth),
      selected_label: monthLabel(selectedMonth),
      start_date: currentRange.start,
      end_date: currentRange.end,
      previous_month: monthKey(previousMonth),
      previous_label: monthLabel(previousMonth),
    },
    summary: {
      current_month_left: currentTotal,
      previous_month_left: previousTotal,
      delta,
      delta_percent: deltaPercent,
      trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    },
    monthly,
    by_teacher: teacherRows.map((row: any) => {
      const teacherId = row.teacher_id == null ? null : Number(row.teacher_id);
      const teacherStudents = deletedStudentRows.filter((student: any) => {
        const studentTeacherId = student.teacher_id == null ? null : Number(student.teacher_id);
        return teacherId != null && studentTeacherId === teacherId;
      });
      return {
        ...row,
        teacher_id: teacherId,
        teacher_name: [row.teacher_first_name, row.teacher_last_name].filter(Boolean).join(' ') || 'No teacher',
        left_count: Number(row.left_count || 0),
        class_count: Number(row.class_count || 0),
        students: teacherStudents,
      };
    }),
    by_class: classRows.map((row: any) => ({
      ...row,
      class_name: row.class_name || 'No group',
      teacher_name: [row.teacher_first_name, row.teacher_last_name].filter(Boolean).join(' ') || 'No teacher',
      left_count: Number(row.left_count || 0),
    })),
    recent_students: deletedStudentRows.slice(0, recentLimit),
  };
};

module.exports = { overview, paymentsReport, attendanceReport, retentionReport };

export {};
