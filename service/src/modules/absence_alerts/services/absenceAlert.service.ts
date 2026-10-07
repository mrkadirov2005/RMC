const absenceAlertRepository = require('../repositories/absenceAlert.repository');
const paymentRepository = require('../../payments/repositories/payment.repository');
const { findOpenAbsenceAlerts } = require('./absenceStreaks');

/** How an admin can close an alert; `sick` also freezes the student. */
const ABSENCE_OUTCOMES = ['sick', 'not_interested', 'excused', 'left'] as const;

const isActiveIn = (student: any, classId: number) =>
  student &&
  !student.is_deleted &&
  !student.is_frozen &&
  String(student.status || 'Active').toLowerCase() === 'active' &&
  Number(student.class_id) === classId;

/** Open alerts in scope, with the student's contact details and group for follow-up. */
const listAlerts = async ({ centerId, teacherId }: { centerId?: number; teacherId?: number }) => {
  const records = await absenceAlertRepository.findRecentAttendance({ centerId, teacherId });
  const studentIds = Array.from(new Set(records.map((record: any) => Number(record.student_id)).filter(Boolean))) as number[];
  const resolutions = await absenceAlertRepository.findResolutions(studentIds);
  const alerts = findOpenAbsenceAlerts({ records, resolutions });
  const details = await absenceAlertRepository.findStudentDetails(alerts.map((alert: any) => alert.student_id));
  const byId = new Map(details.map((row: any) => [Number(row.student_id), row]));

  // Only students still studying in that group: a frozen, removed or transferred record has
  // nothing left to follow up.
  return alerts
    .filter((alert: any) => isActiveIn(byId.get(alert.student_id), alert.class_id))
    .map((alert: any) => {
      const student: any = byId.get(alert.student_id);
      return {
        ...alert,
        student_name: [student.last_name, student.first_name].filter(Boolean).join(' ').trim() || `#${alert.student_id}`,
        phone: student.phone || null,
        parent_name: student.parent_name || null,
        parent_phone: student.parent_phone || null,
        class_name: student.class_name || null,
        teacher_id: student.teacher_id ?? null,
        teacher_name: student.teacher_name || null,
        center_id: student.center_id ?? null,
      };
    });
};

const resolveAlert = async ({
  studentId,
  classId,
  outcome,
  note,
  centerId,
  actingUser,
}: {
  studentId: number;
  classId: number;
  outcome: string;
  note?: string | null;
  centerId?: number;
  actingUser: any;
}) => {
  if (!(ABSENCE_OUTCOMES as readonly string[]).includes(outcome)) return { error: 'invalid_outcome' };
  const alert = (await listAlerts({ centerId })).find((item: any) => item.student_id === studentId && item.class_id === classId);
  if (!alert) return { error: 'not_found' };

  const isOwner = String(actingUser?.role || '').toLowerCase() === 'owner';
  const resolvedByName = actingUser?.id
    ? await paymentRepository.findStaffName(isOwner ? 'owners' : 'superusers', Number(actingUser.id)).catch(() => null)
    : null;
  const resolution = await absenceAlertRepository.insertResolution({
    centerId: alert.center_id ?? centerId ?? null,
    studentId,
    classId,
    resolvedThrough: alert.last_absent_date,
    outcome,
    note: String(note || '').trim() || null,
    resolvedById: Number(actingUser?.id) || null,
    resolvedByType: actingUser?.userType || null,
    resolvedByName: resolvedByName || actingUser?.username || null,
  });
  if (outcome === 'sick') await absenceAlertRepository.freezeStudent(studentId);
  return { resolution, frozen: outcome === 'sick' };
};

module.exports = { listAlerts, resolveAlert, ABSENCE_OUTCOMES };

export {};
