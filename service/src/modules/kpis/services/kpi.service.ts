const kpiRepository = require('../repositories/kpi.repository');
const teacherService = require('../../teachers/services/teacher.service');
const ownerService = require('../../owners/services/owner.service');
const superuserService = require('../../superusers/services/superuser.service');

const round2 = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const computeRetentionScore = (startCount: number, leftCount: number) => {
  if (startCount <= 0) return 100;
  const retained = Math.max(startCount - leftCount, 0);
  return clamp(round2((retained / startCount) * 100), 0, 100);
};

const computeAutoScores = async ({
  centerId,
  teacherId,
  year,
  month,
}: {
  centerId?: number;
  teacherId: number;
  year: number;
  month: number;
}) => {
  const [studentScoreRaw, retentionCounts] = await Promise.all([
    kpiRepository.monthlyStudentScore({ centerId, teacherId, year, month }),
    kpiRepository.monthlyRetentionCounts({ centerId, teacherId, year, month }),
  ]);

  return {
    student_score: clamp(round2(Number(studentScoreRaw) || 0), 0, 100),
    retention_score: computeRetentionScore(retentionCounts.startCount, retentionCounts.leftCount),
  };
};

const computeFinalScore = (studentScore: number, retentionScore: number, contributionScore: number, teachingQualityScore: number) =>
  round2((Number(studentScore) + Number(retentionScore) + Number(contributionScore) + Number(teachingQualityScore)) / 4);

const getPreviousPeriod = () => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
};

const getCurrentPeriod = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

const getOverview = async ({ centerId, year, month }: { centerId?: number; year?: number; month?: number }) => {
  const period = year && month ? { year: Number(year), month: Number(month) } : getCurrentPeriod();
  const teacherRows = await kpiRepository.listTeachers(centerId);

  const teachersOverview = await Promise.all(
    teacherRows.map(async (teacher: any) => {
      const [kpi, preview] = await Promise.all([
        kpiRepository.findRecord(teacher.teacher_id, period.year, period.month, centerId),
        computeAutoScores({ centerId, teacherId: teacher.teacher_id, year: period.year, month: period.month }),
      ]);
      return {
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        center_id: teacher.center_id,
        kpi,
        preview,
      };
    })
  );

  return { year: period.year, month: period.month, teachers: teachersOverview };
};

const getTeacherDetail = async ({ teacherId, centerId }: { teacherId: number; centerId?: number }) => {
  const teacher = await teacherService.getTeacher(teacherId, centerId);
  if (!teacher) return null;

  const [history, currentPreview] = await Promise.all([
    kpiRepository.listRecordsForTeacher(teacherId, centerId),
    computeAutoScores({ centerId, teacherId, ...getCurrentPeriod() }),
  ]);

  return {
    teacher: {
      teacher_id: teacher.teacher_id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
    },
    history,
    current_period: getCurrentPeriod(),
    current_preview: currentPreview,
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

const upsertKpi = async (payload: {
  teacherId: number;
  centerId?: number;
  kpiYear: number;
  kpiMonth: number;
  contributionScore: number;
  teachingQualityScore: number;
  notes?: string;
  actingUser: any;
}) => {
  const [identity, autoScores] = await Promise.all([
    resolveActingUserIdentity(payload.actingUser, payload.centerId),
    computeAutoScores({ centerId: payload.centerId, teacherId: payload.teacherId, year: payload.kpiYear, month: payload.kpiMonth }),
  ]);

  const contributionScore = clamp(round2(Number(payload.contributionScore) || 0), 0, 100);
  const teachingQualityScore = clamp(round2(Number(payload.teachingQualityScore) || 0), 0, 100);

  return kpiRepository.upsertRecord({
    teacherId: payload.teacherId,
    centerId: payload.centerId ?? null,
    kpiYear: payload.kpiYear,
    kpiMonth: payload.kpiMonth,
    studentScore: autoScores.student_score,
    retentionScore: autoScores.retention_score,
    contributionScore,
    teachingQualityScore,
    finalScore: computeFinalScore(autoScores.student_score, autoScores.retention_score, contributionScore, teachingQualityScore),
    ...identity,
    notes: payload.notes ?? null,
  });
};

module.exports = {
  getOverview,
  getTeacherDetail,
  upsertKpi,
  getPreviousPeriod,
  getCurrentPeriod,
};

export {};
