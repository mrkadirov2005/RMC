const { and, desc, eq, gte, inArray, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const {
  classes,
  consolidationAnswers,
  consolidationSets,
  consolidationTrials,
  consolidationWords,
  sessions,
  students,
  teachers,
} = require('../../../db/schema');

const db = pool.db;

const setSelection = {
  consolidation_set_id: consolidationSets.consolidationSetId,
  center_id: consolidationSets.centerId,
  class_id: consolidationSets.classId,
  session_id: consolidationSets.sessionId,
  teacher_id: consolidationSets.teacherId,
  title: consolidationSets.title,
  violation_limit: consolidationSets.violationLimit,
  share_token: consolidationSets.shareToken,
  deleted_at: consolidationSets.deletedAt,
  created_at: consolidationSets.createdAt,
  updated_at: consolidationSets.updatedAt,
};

const wordSelection = {
  consolidation_word_id: consolidationWords.consolidationWordId,
  consolidation_set_id: consolidationWords.consolidationSetId,
  word_order: consolidationWords.wordOrder,
  main_word: consolidationWords.mainWord,
  translations: consolidationWords.translations,
};

const publicWordSelection = {
  consolidation_word_id: consolidationWords.consolidationWordId,
  word_order: consolidationWords.wordOrder,
  main_word: consolidationWords.mainWord,
};

const trialSelection = {
  trial_id: consolidationTrials.trialId,
  consolidation_set_id: consolidationTrials.consolidationSetId,
  student_id: consolidationTrials.studentId,
  center_id: consolidationTrials.centerId,
  trial_number: consolidationTrials.trialNumber,
  status: consolidationTrials.status,
  started_at: consolidationTrials.startedAt,
  submitted_at: consolidationTrials.submittedAt,
  correct_count: consolidationTrials.correctCount,
  total_words: consolidationTrials.totalWords,
  is_passed: consolidationTrials.isPassed,
  violation_count: consolidationTrials.violationCount,
  time_taken_seconds: consolidationTrials.timeTakenSeconds,
  via_share_link: consolidationTrials.viaShareLink,
  ip_address: consolidationTrials.ipAddress,
  user_agent: consolidationTrials.userAgent,
};

// Includes access_token — only for the internal token-verification path and the
// one-time response to whoever just started the trial. Never expose this via
// trialSelection, which backs teacher/student-facing detail and dashboard views.
const trialWithTokenSelection = {
  ...trialSelection,
  access_token: consolidationTrials.accessToken,
};

const answerSelection = {
  answer_id: consolidationAnswers.answerId,
  trial_id: consolidationAnswers.trialId,
  consolidation_word_id: consolidationAnswers.consolidationWordId,
  student_answer: consolidationAnswers.studentAnswer,
  is_correct: consolidationAnswers.isCorrect,
};

const findSessionMeta = async (sessionId: number) => {
  const rows = await db
    .select({
      session_id: sessions.sessionId,
      center_id: sessions.centerId,
      class_id: sessions.classId,
      teacher_id: sessions.teacherId,
    })
    .from(sessions)
    .where(and(eq(sessions.sessionId, Number(sessionId)), sql`${sessions.deletedAt} IS NULL`));
  return rows[0] || null;
};

const findSetBySession = async (sessionId: number, centerId?: number) => {
  const conditions = [eq(consolidationSets.sessionId, Number(sessionId)), sql`${consolidationSets.deletedAt} IS NULL`];
  if (centerId) conditions.push(eq(consolidationSets.centerId, Number(centerId)));
  const rows = await db.select(setSelection).from(consolidationSets).where(and(...conditions));
  return rows[0] || null;
};

const findSetById = async (setId: number, centerId?: number) => {
  const conditions = [eq(consolidationSets.consolidationSetId, Number(setId)), sql`${consolidationSets.deletedAt} IS NULL`];
  if (centerId) conditions.push(eq(consolidationSets.centerId, Number(centerId)));
  const rows = await db.select(setSelection).from(consolidationSets).where(and(...conditions));
  return rows[0] || null;
};

const findSetByShareToken = async (shareToken: string) => {
  const rows = await db
    .select(setSelection)
    .from(consolidationSets)
    .where(and(eq(consolidationSets.shareToken, shareToken), sql`${consolidationSets.deletedAt} IS NULL`));
  return rows[0] || null;
};

const findPublicSetMeta = async (shareToken: string) => {
  const rows = await db
    .select({
      ...setSelection,
      class_name: classes.className,
      session_date: sessions.sessionDate,
    })
    .from(consolidationSets)
    .innerJoin(classes, eq(classes.classId, consolidationSets.classId))
    .innerJoin(sessions, eq(sessions.sessionId, consolidationSets.sessionId))
    .where(and(eq(consolidationSets.shareToken, shareToken), sql`${consolidationSets.deletedAt} IS NULL`));
  return rows[0] || null;
};

const insertSet = async (values: any, runner: any = db) => {
  const rows = await runner
    .insert(consolidationSets)
    .values({
      centerId: values.centerId,
      classId: values.classId,
      sessionId: values.sessionId,
      teacherId: values.teacherId,
      title: values.title ?? null,
      violationLimit: values.violationLimit ?? 3,
      shareToken: values.shareToken,
    })
    .returning(setSelection);
  return rows[0];
};

const insertWords = async (setId: number, words: Array<{ main_word: string; translations: string[]; word_order: number }>, runner: any = db) => {
  if (words.length === 0) return [];
  const rows = await runner
    .insert(consolidationWords)
    .values(words.map((word) => ({
      consolidationSetId: Number(setId),
      wordOrder: word.word_order,
      mainWord: word.main_word,
      translations: word.translations,
    })))
    .returning(wordSelection);
  return rows;
};

const findWordsBySet = async (setId: number) =>
  db.select(wordSelection).from(consolidationWords).where(eq(consolidationWords.consolidationSetId, Number(setId))).orderBy(consolidationWords.wordOrder);

const findWordsBySetPublic = async (setId: number) =>
  db.select(publicWordSelection).from(consolidationWords).where(eq(consolidationWords.consolidationSetId, Number(setId))).orderBy(consolidationWords.wordOrder);

const softDeleteSet = async (setId: number, centerId?: number) => {
  const conditions = [eq(consolidationSets.consolidationSetId, Number(setId)), sql`${consolidationSets.deletedAt} IS NULL`];
  if (centerId) conditions.push(eq(consolidationSets.centerId, Number(centerId)));
  const rows = await db
    .update(consolidationSets)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...conditions))
    .returning(setSelection);
  return rows[0] || null;
};

const updateShareToken = async (setId: number, shareToken: string, centerId?: number) => {
  const conditions = [eq(consolidationSets.consolidationSetId, Number(setId)), sql`${consolidationSets.deletedAt} IS NULL`];
  if (centerId) conditions.push(eq(consolidationSets.centerId, Number(centerId)));
  const rows = await db
    .update(consolidationSets)
    .set({ shareToken, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...conditions))
    .returning(setSelection);
  return rows[0] || null;
};

const countTrialsForSet = async (setId: number) => {
  const rows = await db.select({ total: sql`COUNT(*)` }).from(consolidationTrials).where(eq(consolidationTrials.consolidationSetId, Number(setId)));
  return Number(rows[0]?.total || 0);
};

const findTrialsForSet = async (setId: number) =>
  db.select(trialSelection).from(consolidationTrials).where(eq(consolidationTrials.consolidationSetId, Number(setId))).orderBy(desc(consolidationTrials.startedAt));

// Overview sets with their teacher/class/session labels and word counts. Teachers
// pass a teacherId to limit this query to their own consolidation sets.
const findOverviewSets = async (centerId: number, teacherId?: number) => {
  const conditions = [
    eq(consolidationSets.centerId, Number(centerId)),
    sql`${consolidationSets.deletedAt} IS NULL`,
  ];
  if (teacherId != null) conditions.push(eq(consolidationSets.teacherId, Number(teacherId)));

  return db
    .select({
      consolidation_set_id: consolidationSets.consolidationSetId,
      title: consolidationSets.title,
      teacher_id: consolidationSets.teacherId,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
      class_id: consolidationSets.classId,
      class_name: classes.className,
      session_id: consolidationSets.sessionId,
      session_date: sessions.sessionDate,
      word_count: sql<number>`(SELECT COUNT(*) FROM ${consolidationWords} w WHERE w.consolidation_set_id = ${consolidationSets.consolidationSetId})`,
      created_at: consolidationSets.createdAt,
    })
    .from(consolidationSets)
    .innerJoin(classes, eq(classes.classId, consolidationSets.classId))
    .innerJoin(sessions, eq(sessions.sessionId, consolidationSets.sessionId))
    .innerJoin(teachers, eq(teachers.teacherId, consolidationSets.teacherId))
    .where(and(...conditions))
    .orderBy(desc(consolidationSets.createdAt));
};

// One row per set: trial_count (every attempt), student_count (distinct students
// with at least one attempt), passed_student_count (distinct students with at
// least one passed attempt) — computed in one aggregation query rather than
// looping per-set in application code.
const findTrialAggregatesForSets = async (setIds: number[]) => {
  if (setIds.length === 0) return [];
  return db
    .select({
      consolidation_set_id: consolidationTrials.consolidationSetId,
      trial_count: sql<number>`COUNT(*)`,
      student_count: sql<number>`COUNT(DISTINCT ${consolidationTrials.studentId})`,
      passed_student_count: sql<number>`COUNT(DISTINCT ${consolidationTrials.studentId}) FILTER (WHERE ${consolidationTrials.isPassed})`,
      total_violations: sql<number>`COALESCE(SUM(${consolidationTrials.violationCount}), 0)`,
    })
    .from(consolidationTrials)
    .where(inArray(consolidationTrials.consolidationSetId, setIds.map(Number)))
    .groupBy(consolidationTrials.consolidationSetId);
};

// One row per (student, set): how many attempts, which attempt first passed on
// (null if never), and how many lockdown violations they racked up on this set —
// the raw material for the overview's effectiveness-by-attempt-number chart.
const findStudentOutcomesForSets = async (setIds: number[]) => {
  if (setIds.length === 0) return [];
  return db
    .select({
      student_id: consolidationTrials.studentId,
      student_first_name: students.firstName,
      student_last_name: students.lastName,
      consolidation_set_id: consolidationTrials.consolidationSetId,
      trial_count: sql<number>`COUNT(*)`,
      first_pass_attempt: sql<number | null>`MIN(${consolidationTrials.trialNumber}) FILTER (WHERE ${consolidationTrials.isPassed})`,
      violation_count: sql<number>`COALESCE(SUM(${consolidationTrials.violationCount}), 0)`,
    })
    .from(consolidationTrials)
    .innerJoin(students, eq(students.studentId, consolidationTrials.studentId))
    .where(inArray(consolidationTrials.consolidationSetId, setIds.map(Number)))
    .groupBy(consolidationTrials.studentId, students.firstName, students.lastName, consolidationTrials.consolidationSetId);
};

const findTrialsByStudentAndSet = async (setId: number, studentId: number) =>
  db
    .select(trialSelection)
    .from(consolidationTrials)
    .where(and(eq(consolidationTrials.consolidationSetId, Number(setId)), eq(consolidationTrials.studentId, Number(studentId))))
    .orderBy(desc(consolidationTrials.trialNumber));

const findTrialById = async (trialId: number) => {
  const rows = await db.select(trialSelection).from(consolidationTrials).where(eq(consolidationTrials.trialId, Number(trialId)));
  return rows[0] || null;
};

const countTrialsByStudentForSet = async (setId: number, studentId: number, runner: any = db) => {
  const rows = await runner
    .select({ total: sql`COUNT(*)` })
    .from(consolidationTrials)
    .where(and(eq(consolidationTrials.consolidationSetId, Number(setId)), eq(consolidationTrials.studentId, Number(studentId))));
  return Number(rows[0]?.total || 0);
};

const findCompletedTrialToday = async (setId: number, studentId: number) => {
  const rows = await db
    .select(trialSelection)
    .from(consolidationTrials)
    .where(and(
      eq(consolidationTrials.consolidationSetId, Number(setId)),
      eq(consolidationTrials.studentId, Number(studentId)),
      eq(consolidationTrials.status, 'completed'),
      gte(consolidationTrials.submittedAt, sql`CURRENT_DATE`)
    ))
    .orderBy(desc(consolidationTrials.submittedAt))
    .limit(1);
  return rows[0] || null;
};

const insertTrial = async (values: any, runner: any = db) => {
  const rows = await runner
    .insert(consolidationTrials)
    .values({
      consolidationSetId: values.consolidationSetId,
      studentId: values.studentId,
      centerId: values.centerId ?? null,
      trialNumber: values.trialNumber,
      status: 'in_progress',
      startedAt: values.startedAt ?? new Date(),
      viaShareLink: values.viaShareLink ?? false,
      ipAddress: values.ipAddress ?? null,
      userAgent: values.userAgent ?? null,
      accessToken: values.accessToken ?? null,
    })
    .returning(trialWithTokenSelection);
  return rows[0];
};

// Single query covering both what resolveTrialForToken needs to verify (set + token
// match) and what it hands back to the caller — avoids a second findTrialById for
// the same row once the token check passes.
const findTrialWithAuth = async (trialId: number) => {
  const rows = await db.select(trialWithTokenSelection).from(consolidationTrials).where(eq(consolidationTrials.trialId, Number(trialId)));
  return rows[0] || null;
};

const incrementViolationCount = async (trialId: number) => {
  const rows = await db
    .update(consolidationTrials)
    .set({ violationCount: sql`${consolidationTrials.violationCount} + 1` })
    .where(eq(consolidationTrials.trialId, Number(trialId)))
    .returning(trialSelection);
  return rows[0] || null;
};

const finalizeTrial = async (trialId: number, values: { status: string; correctCount: number; totalWords: number; isPassed: boolean; timeTakenSeconds: number | null }) => {
  const rows = await db
    .update(consolidationTrials)
    .set({
      status: values.status,
      correctCount: values.correctCount,
      totalWords: values.totalWords,
      isPassed: values.isPassed,
      submittedAt: sql`CURRENT_TIMESTAMP`,
      timeTakenSeconds: values.timeTakenSeconds,
    })
    .where(eq(consolidationTrials.trialId, Number(trialId)))
    .returning(trialSelection);
  return rows[0] || null;
};

const upsertAnswer = async (trialId: number, wordId: number, studentAnswer: string | null) => {
  const rows = await db
    .insert(consolidationAnswers)
    .values({ trialId: Number(trialId), consolidationWordId: Number(wordId), studentAnswer, isCorrect: false })
    .onConflictDoUpdate({
      target: [consolidationAnswers.trialId, consolidationAnswers.consolidationWordId],
      set: { studentAnswer },
    })
    .returning(answerSelection);
  return rows[0];
};

const findAnswersByTrial = async (trialId: number) =>
  db.select(answerSelection).from(consolidationAnswers).where(eq(consolidationAnswers.trialId, Number(trialId)));

const setAnswerCorrectness = async (answerId: number, isCorrect: boolean) => {
  await db.update(consolidationAnswers).set({ isCorrect }).where(eq(consolidationAnswers.answerId, Number(answerId)));
};

module.exports = {
  findSessionMeta,
  findSetBySession,
  findSetById,
  findSetByShareToken,
  findOverviewSets,
  findTrialAggregatesForSets,
  findStudentOutcomesForSets,
  findPublicSetMeta,
  insertSet,
  insertWords,
  findWordsBySet,
  findWordsBySetPublic,
  softDeleteSet,
  updateShareToken,
  countTrialsForSet,
  findTrialsForSet,
  findTrialsByStudentAndSet,
  findTrialById,
  findTrialWithAuth,
  countTrialsByStudentForSet,
  findCompletedTrialToday,
  insertTrial,
  incrementViolationCount,
  finalizeTrial,
  upsertAnswer,
  findAnswersByTrial,
  setAnswerCorrectness,
};

export {};
