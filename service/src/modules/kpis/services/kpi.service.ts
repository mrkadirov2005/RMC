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

// On-time scoring out of 100: lesson control's month points (-5 for every day a lesson was scored
// late or not at all, +10 for a clean finished month) taken from 100.
const computeGradingScore = (disciplinePoints: number) => clamp(round2(100 + Number(disciplinePoints || 0)), 0, 100);

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

const monthlyDisciplinePoints = async ({ centerId, teacherId, year, month }: { centerId?: number; teacherId: number; year: number; month: number }) => {
  // Required here: lesson control loads the class schedule model, which the KPI module need not load otherwise.
  const lessonControl = require('../../lesson_control/services/lessonControl.service');
  const result = await lessonControl.discipline({ month: monthKey(year, month) }, centerId, teacherId);
  return Number(result?.teachers?.[0]?.summary?.points || 0);
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
  const [studentScoreRaw, retentionCounts, disciplinePoints, referralCount] = await Promise.all([
    kpiRepository.monthlyStudentScore({ centerId, teacherId, year, month }),
    kpiRepository.monthlyRetentionCounts({ centerId, teacherId, year, month }),
    // A part that cannot be worked out counts as 0 rather than failing the whole KPI page.
    Promise.resolve().then(() => monthlyDisciplinePoints({ centerId, teacherId, year, month })).catch(() => 0),
    Promise.resolve().then(() => kpiRepository.monthlyReferralCount({ centerId, teacherId, year, month })).catch(() => 0),
  ]);

  return {
    student_score: clamp(round2(Number(studentScoreRaw) || 0), 0, 100),
    retention_score: computeRetentionScore(retentionCounts.startCount, retentionCounts.leftCount),
    grading_score: computeGradingScore(disciplinePoints),
    referral_count: Number(referralCount) || 0,
  };
};

/**
 * The month's KPI: the average of the six parts out of 100 (retention, average lesson score,
 * contribution, exam, teaching quality, on-time scoring) plus 1 point for each new student who
 * came asking for the teacher.
 */
const computeFinalScore = (parts: {
  studentScore: number; retentionScore: number; contributionScore: number; examScore: number; teachingQualityScore: number; gradingScore: number; referralCount: number;
}) => {
  const outOf100 = [parts.retentionScore, parts.studentScore, parts.contributionScore, parts.examScore, parts.teachingQualityScore, parts.gradingScore]
    .map((value) => Number(value) || 0);
  return round2(outOf100.reduce((sum, value) => sum + value, 0) / outOf100.length + (Number(parts.referralCount) || 0));
};

/** Places by score, highest first; equal scores share a place. */
const rankBy = <T>(rows: T[], score: (row: T) => number | null) => {
  const scored = rows.filter((row) => score(row) !== null).sort((a, b) => Number(score(b)) - Number(score(a)));
  const places = new Map<T, number>();
  scored.forEach((row, index) => {
    const previous = scored[index - 1];
    places.set(row, previous && score(previous) === score(row) ? places.get(previous)! : index + 1);
  });
  return places;
};

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

  const [teachersOverview, yearRecords] = await Promise.all([
    Promise.all(
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
    ),
    Promise.resolve().then(() => kpiRepository.listRecordsForYear(period.year, centerId)).catch(() => []),
  ]);

  // The year so far: every saved month from January up to this one, added up.
  const yearTotals = new Map<number, number>();
  yearRecords
    .filter((record: any) => Number(record.kpi_month) <= period.month)
    .forEach((record: any) => {
      const id = Number(record.teacher_id);
      yearTotals.set(id, round2((yearTotals.get(id) || 0) + Number(record.final_score || 0)));
    });

  const monthPlaces = rankBy(teachersOverview, (row: any) => (row.kpi ? Number(row.kpi.final_score) : null));
  const yearPlaces = rankBy(teachersOverview, (row: any) => (yearTotals.has(Number(row.teacher_id)) ? yearTotals.get(Number(row.teacher_id))! : null));

  return {
    year: period.year,
    month: period.month,
    teachers: teachersOverview.map((row: any) => ({
      ...row,
      month_place: monthPlaces.get(row) ?? null,
      year_total: yearTotals.get(Number(row.teacher_id)) ?? null,
      year_place: yearPlaces.get(row) ?? null,
    })),
  };
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
  examScore?: number;
  notes?: string;
  actingUser: any;
}) => {
  const [identity, autoScores] = await Promise.all([
    resolveActingUserIdentity(payload.actingUser, payload.centerId),
    computeAutoScores({ centerId: payload.centerId, teacherId: payload.teacherId, year: payload.kpiYear, month: payload.kpiMonth }),
  ]);

  const contributionScore = clamp(round2(Number(payload.contributionScore) || 0), 0, 100);
  const teachingQualityScore = clamp(round2(Number(payload.teachingQualityScore) || 0), 0, 100);
  const examScore = clamp(round2(Number(payload.examScore) || 0), 0, 100);

  return kpiRepository.upsertRecord({
    teacherId: payload.teacherId,
    centerId: payload.centerId ?? null,
    kpiYear: payload.kpiYear,
    kpiMonth: payload.kpiMonth,
    studentScore: autoScores.student_score,
    retentionScore: autoScores.retention_score,
    contributionScore,
    teachingQualityScore,
    examScore,
    gradingScore: autoScores.grading_score,
    referralCount: autoScores.referral_count,
    finalScore: computeFinalScore({
      studentScore: autoScores.student_score,
      retentionScore: autoScores.retention_score,
      contributionScore,
      examScore,
      teachingQualityScore,
      gradingScore: autoScores.grading_score,
      referralCount: autoScores.referral_count,
    }),
    ...identity,
    notes: payload.notes ?? null,
  });
};

module.exports = {
  computeFinalScore,
  computeGradingScore,
  rankBy,
  getOverview,
  getTeacherDetail,
  upsertKpi,
  getPreviousPeriod,
  getCurrentPeriod,
};

export {};
