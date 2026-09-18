const crypto = require('crypto');
const consolidationRepository = require('../repositories/consolidation.repository');
const pool = require('../../../db/pool');
const studentService = require('../../students/services/student.service');
const { isAnswerCorrect } = require('../grading');

const generateShareToken = () => crypto.randomBytes(24).toString('base64url');

const withTransaction = async (handler: (db: any) => Promise<any>) => pool.db.transaction(handler);

const isStudentEnrolled = async (classId: number, studentId: number, centerId?: number) => {
  const roster = await studentService.listClassStudentsWithTransfers(Number(classId), centerId ?? undefined);
  return roster.some((student: any) => Number(student.student_id) === Number(studentId));
};

const teacherOwnsSet = (set: any, caller: { userType?: string; teacherId?: number }) =>
  caller.userType !== 'teacher' || Number(set.teacher_id) === Number(caller.teacherId);

// --- Teacher / superuser side ---------------------------------------------

const createSet = async (body: any, caller: { userType?: string; teacherId?: number; centerId?: number }) => {
  // Independent lookups — neither depends on the other's result — so they can run
  // concurrently instead of as two sequential round trips.
  const [session, existing] = await Promise.all([
    consolidationRepository.findSessionMeta(body.session_id),
    consolidationRepository.findSetBySession(body.session_id, caller.centerId),
  ]);
  if (!session) return { error: 'session_not_found' as const };
  if (caller.centerId && Number(session.center_id) !== Number(caller.centerId)) {
    return { error: 'session_not_found' as const };
  }
  if (caller.userType === 'teacher' && Number(session.teacher_id) !== Number(caller.teacherId)) {
    return { error: 'forbidden' as const };
  }
  if (existing) return { error: 'already_exists' as const };

  const words = (body.words || []).map((word: any, index: number) => ({
    main_word: word.main_word,
    translations: word.translations,
    word_order: index + 1,
  }));

  return withTransaction(async (db: any) => {
    const set = await consolidationRepository.insertSet({
      centerId: caller.centerId ?? session.center_id,
      classId: session.class_id,
      sessionId: session.session_id,
      teacherId: caller.userType === 'teacher' ? caller.teacherId : session.teacher_id,
      title: body.title,
      violationLimit: body.violation_limit,
      shareToken: generateShareToken(),
    }, db);
    const savedWords = await consolidationRepository.insertWords(set.consolidation_set_id, words, db);
    return { set, words: savedWords };
  });
};

const getSetForTeacher = async (sessionId: number, centerId: number | undefined, caller: { userType?: string; teacherId?: number } = {}) => {
  const set = await consolidationRepository.findSetBySession(sessionId, centerId);
  if (!set) return null;
  if (!teacherOwnsSet(set, caller)) return { error: 'forbidden' as const };
  const words = await consolidationRepository.findWordsBySet(set.consolidation_set_id);
  return { ...set, words };
};

const getSetForStudentView = async (sessionId: number, centerId: number | undefined, studentId: number) => {
  const set = await consolidationRepository.findSetBySession(sessionId, centerId);
  if (!set) return null;
  const enrolled = await isStudentEnrolled(set.class_id, studentId, centerId);
  if (!enrolled) return { error: 'forbidden' as const };
  const words = await consolidationRepository.findWordsBySetPublic(set.consolidation_set_id);
  return {
    consolidation_set_id: set.consolidation_set_id,
    title: set.title,
    violation_limit: set.violation_limit,
    words,
  };
};

const summarizeTrialsByStudent = (trials: any[]) => {
  const byStudent = new Map<number, any[]>();
  for (const trial of trials) {
    const list = byStudent.get(Number(trial.student_id)) || [];
    list.push(trial);
    byStudent.set(Number(trial.student_id), list);
  }
  return byStudent;
};

const getResultsDashboard = async (sessionId: number, centerId: number | undefined, caller: { userType?: string; teacherId?: number } = {}) => {
  const set = await consolidationRepository.findSetBySession(sessionId, centerId);
  if (!set) return null;
  if (!teacherOwnsSet(set, caller)) return { error: 'forbidden' as const };
  const [roster, trials] = await Promise.all([
    studentService.listClassStudentsWithTransfers(Number(set.class_id), centerId ?? undefined),
    consolidationRepository.findTrialsForSet(set.consolidation_set_id),
  ]);
  const byStudent = summarizeTrialsByStudent(trials);

  const rows = roster.map((student: any) => {
    const studentTrials = byStudent.get(Number(student.student_id)) || [];
    const best = studentTrials.reduce((acc: any, trial: any) => {
      if (!acc) return trial;
      const accScore = Number(acc.correct_count ?? -1);
      const trialScore = Number(trial.correct_count ?? -1);
      return trialScore > accScore ? trial : acc;
    }, null);
    const latest = studentTrials[0] || null;
    return {
      student_id: student.student_id,
      first_name: student.first_name,
      last_name: student.last_name,
      submitted: studentTrials.length > 0,
      trial_count: studentTrials.length,
      best_trial: best,
      latest_trial: latest,
    };
  });

  return {
    set,
    summary: {
      total: roster.length,
      submitted: rows.filter((row: any) => row.submitted).length,
    },
    rows,
  };
};

// Consolidation overview: superusers receive center-wide data while teachers are
// limited to their own sets. One extra aggregation query avoids looping per set.
const getConsolidationsOverview = async (
  centerId: number,
  caller: { userType?: string; teacherId?: number } = {},
) => {
  const teacherId = caller.userType === 'teacher' ? caller.teacherId : undefined;
  const sets = await consolidationRepository.findOverviewSets(centerId, teacherId);
  const setIds = sets.map((set: any) => set.consolidation_set_id);
  const aggregates = await consolidationRepository.findTrialAggregatesForSets(setIds);
  const aggByset = new Map<number, any>(aggregates.map((agg: any) => [Number(agg.consolidation_set_id), agg]));

  const items = sets.map((set: any) => {
    const agg = aggByset.get(Number(set.consolidation_set_id));
    const trialCount = Number(agg?.trial_count ?? 0);
    const studentCount = Number(agg?.student_count ?? 0);
    const passedStudentCount = Number(agg?.passed_student_count ?? 0);
    const totalViolations = Number(agg?.total_violations ?? 0);
    return {
      consolidation_set_id: set.consolidation_set_id,
      title: set.title,
      teacher_id: set.teacher_id,
      teacher_name: `${set.teacher_first_name} ${set.teacher_last_name}`.trim(),
      class_id: set.class_id,
      class_name: set.class_name,
      session_id: set.session_id,
      session_date: set.session_date,
      word_count: Number(set.word_count ?? 0),
      created_at: set.created_at,
      trial_count: trialCount,
      student_count: studentCount,
      passed_student_count: passedStudentCount,
      pass_rate: studentCount > 0 ? passedStudentCount / studentCount : null,
      total_violations: totalViolations,
    };
  });

  const totals = items.reduce(
    (acc: any, item: any) => ({
      total_sets: acc.total_sets + 1,
      total_trials: acc.total_trials + item.trial_count,
      total_students_submitted: acc.total_students_submitted + item.student_count,
      total_students_passed: acc.total_students_passed + item.passed_student_count,
      total_violations: acc.total_violations + item.total_violations,
    }),
    { total_sets: 0, total_trials: 0, total_students_submitted: 0, total_students_passed: 0, total_violations: 0 }
  );

  const byTeacherMap = new Map<number, any>();
  for (const item of items) {
    const key = Number(item.teacher_id);
    const entry = byTeacherMap.get(key) ?? {
      teacher_id: item.teacher_id,
      teacher_name: item.teacher_name,
      sets_count: 0,
      trial_count: 0,
      student_count: 0,
      passed_student_count: 0,
      total_violations: 0,
    };
    entry.sets_count += 1;
    entry.trial_count += item.trial_count;
    entry.student_count += item.student_count;
    entry.passed_student_count += item.passed_student_count;
    entry.total_violations += item.total_violations;
    byTeacherMap.set(key, entry);
  }
  const byTeacher = Array.from(byTeacherMap.values()).map((entry: any) => ({
    ...entry,
    pass_rate: entry.student_count > 0 ? entry.passed_student_count / entry.student_count : null,
  }));

  // Per-(student, set) outcomes — the raw material for the effectiveness-by-
  // attempt-number chart and its click-to-drill-down list. Enriched here with
  // the teacher/class/session context already computed above, rather than a
  // second join, since `items` already carries it per set.
  const setContext = new Map<number, any>(items.map((item: any) => [Number(item.consolidation_set_id), item]));
  const rawOutcomes = await consolidationRepository.findStudentOutcomesForSets(setIds);
  const outcomes = rawOutcomes.map((row: any) => {
    const ctx = setContext.get(Number(row.consolidation_set_id));
    const firstPassAttempt = row.first_pass_attempt == null ? null : Number(row.first_pass_attempt);
    const bucket: 'passed_1' | 'passed_2' | 'passed_3_plus' | 'never_passed' =
      firstPassAttempt == null ? 'never_passed' : firstPassAttempt === 1 ? 'passed_1' : firstPassAttempt === 2 ? 'passed_2' : 'passed_3_plus';
    return {
      student_id: row.student_id,
      student_name: `${row.student_first_name} ${row.student_last_name}`.trim(),
      consolidation_set_id: row.consolidation_set_id,
      set_title: ctx?.title ?? null,
      teacher_id: ctx?.teacher_id ?? null,
      teacher_name: ctx?.teacher_name ?? null,
      class_id: ctx?.class_id ?? null,
      class_name: ctx?.class_name ?? null,
      session_id: ctx?.session_id ?? null,
      session_date: ctx?.session_date ?? null,
      trial_count: Number(row.trial_count),
      first_pass_attempt: firstPassAttempt,
      violation_count: Number(row.violation_count),
      bucket,
    };
  });

  const effectiveness = {
    passed_1: outcomes.filter((o: any) => o.bucket === 'passed_1').length,
    passed_2: outcomes.filter((o: any) => o.bucket === 'passed_2').length,
    passed_3_plus: outcomes.filter((o: any) => o.bucket === 'passed_3_plus').length,
    never_passed: outcomes.filter((o: any) => o.bucket === 'never_passed').length,
    had_violations: outcomes.filter((o: any) => o.violation_count > 0).length,
  };

  return {
    totals: {
      ...totals,
      overall_pass_rate: totals.total_students_submitted > 0 ? totals.total_students_passed / totals.total_students_submitted : null,
    },
    by_teacher: byTeacher,
    sets: items,
    outcomes,
    effectiveness,
  };
};

const getTrial = async (trialId: number) => consolidationRepository.findTrialById(trialId);

const getTrialDetail = async (trialId: number, requester: { userType?: string; id?: number; centerId?: number }) => {
  const trial = await consolidationRepository.findTrialById(trialId);
  if (!trial) return null;
  if (requester.userType === 'student') {
    if (Number(trial.student_id) !== Number(requester.id)) return { error: 'forbidden' as const };
  } else if (requester.centerId && Number(trial.center_id) !== Number(requester.centerId)) {
    return { error: 'forbidden' as const };
  }
  const [words, answers] = await Promise.all([
    consolidationRepository.findWordsBySet(trial.consolidation_set_id),
    consolidationRepository.findAnswersByTrial(trial.trial_id),
  ]);
  const answerByWord = new Map<number, any>(answers.map((answer: any) => [Number(answer.consolidation_word_id), answer]));
  const items = words.map((word: any) => ({
    consolidation_word_id: word.consolidation_word_id,
    word_order: word.word_order,
    main_word: word.main_word,
    translations: word.translations,
    student_answer: answerByWord.get(Number(word.consolidation_word_id))?.student_answer ?? null,
    is_correct: answerByWord.get(Number(word.consolidation_word_id))?.is_correct ?? null,
  }));
  return { trial, words: items };
};

const deleteSet = async (setId: number, centerId: number | undefined, caller: { userType?: string; teacherId?: number } = {}) => {
  const set = await consolidationRepository.findSetById(setId, centerId);
  if (!set) return null;
  if (!teacherOwnsSet(set, caller)) return { error: 'forbidden' as const };
  const trialCount = await consolidationRepository.countTrialsForSet(setId);
  if (trialCount > 0) return { error: 'has_trials' as const };
  return consolidationRepository.softDeleteSet(setId, centerId);
};

const regenerateLink = async (setId: number, centerId: number | undefined, caller: { userType?: string; teacherId?: number } = {}) => {
  const set = await consolidationRepository.findSetById(setId, centerId);
  if (!set) return null;
  if (!teacherOwnsSet(set, caller)) return { error: 'forbidden' as const };
  return consolidationRepository.updateShareToken(setId, generateShareToken(), centerId);
};

// --- Trial lifecycle (shared by authenticated + public flows) -------------

const UNIQUE_VIOLATION = '23505';
const MAX_TRIAL_NUMBER_RETRIES = 3;

const startTrialForSet = async (
  set: any,
  studentId: number,
  meta: { viaShareLink?: boolean; ipAddress?: string | null; userAgent?: string | null } = {},
  alreadyEnrolled = false
) => {
  const enrolled = alreadyEnrolled || (await isStudentEnrolled(set.class_id, studentId, set.center_id));
  if (!enrolled) return { error: 'forbidden' as const };

  const accessToken = meta.viaShareLink ? generateShareToken() : null;

  for (let attempt = 0; attempt < MAX_TRIAL_NUMBER_RETRIES; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const trial = await withTransaction(async (db: any) => {
        const priorCount = await consolidationRepository.countTrialsByStudentForSet(set.consolidation_set_id, studentId, db);
        return consolidationRepository.insertTrial({
          consolidationSetId: set.consolidation_set_id,
          studentId,
          centerId: set.center_id,
          trialNumber: priorCount + 1,
          viaShareLink: meta.viaShareLink ?? false,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
          accessToken,
        }, db);
      });
      const words = await consolidationRepository.findWordsBySetPublic(set.consolidation_set_id);
      return { trial, words };
    } catch (error: any) {
      // Two concurrent start-trial requests can both read the same prior count and
      // race on the (set, student, trial_number) unique index — retry with a fresh
      // count instead of surfacing a 500 for what is really just a benign collision.
      const isRetryable = error?.code === UNIQUE_VIOLATION || error?.cause?.code === UNIQUE_VIOLATION;
      if (!isRetryable || attempt === MAX_TRIAL_NUMBER_RETRIES - 1) throw error;
    }
  }
  throw new Error('Failed to start trial after retries');
};

const startTrial = async (setId: number, studentId: number, centerId?: number) => {
  const set = await consolidationRepository.findSetById(setId, centerId);
  if (!set) return null;
  return startTrialForSet(set, studentId);
};

// Each of saveAnswer/gradeAndFinalize/logViolation accepts an optional already-loaded
// trial row — the controller layer typically fetches the trial once to check ownership
// before calling in, and re-fetching the same row here would be a wasted round trip.
const saveAnswer = async (trialId: number, wordId: number, answer: string | null, preloadedTrial?: any) => {
  const trial = preloadedTrial ?? (await consolidationRepository.findTrialById(trialId));
  if (!trial) return null;
  if (trial.status !== 'in_progress') return { error: 'not_in_progress' as const };
  return consolidationRepository.upsertAnswer(trialId, wordId, answer ?? null);
};

const gradeAndFinalize = async (trialId: number, status: 'completed' | 'auto_submitted', preloadedTrial?: any) => {
  const trial = preloadedTrial ?? (await consolidationRepository.findTrialById(trialId));
  if (!trial) return null;
  if (trial.status !== 'in_progress') return trial;

  const [words, answers] = await Promise.all([
    consolidationRepository.findWordsBySet(trial.consolidation_set_id),
    consolidationRepository.findAnswersByTrial(trialId),
  ]);
  const answerByWord = new Map<number, any>(answers.map((answer: any) => [Number(answer.consolidation_word_id), answer]));

  let correctCount = 0;
  const gradingWrites: Array<Promise<void>> = [];
  for (const word of words) {
    const answer: any = answerByWord.get(Number(word.consolidation_word_id));
    const correct = isAnswerCorrect(answer?.student_answer ?? null, word.translations);
    if (correct) correctCount += 1;
    if (answer) gradingWrites.push(consolidationRepository.setAnswerCorrectness(answer.answer_id, correct));
  }
  await Promise.all(gradingWrites);

  const totalWords = words.length;
  const timeTakenSeconds = Math.max(0, Math.round((Date.now() - new Date(trial.started_at).getTime()) / 1000));

  return consolidationRepository.finalizeTrial(trialId, {
    status,
    correctCount,
    totalWords,
    isPassed: totalWords > 0 && correctCount === totalWords,
    timeTakenSeconds,
  });
};

const submitTrial = async (trialId: number, preloadedTrial?: any) => gradeAndFinalize(trialId, 'completed', preloadedTrial);

const logViolation = async (trialId: number, preloadedTrial?: any) => {
  const trial = preloadedTrial ?? (await consolidationRepository.findTrialById(trialId));
  if (!trial) return null;
  if (trial.status !== 'in_progress') return { trial, auto_submitted: false };

  // Independent — incrementing the counter doesn't depend on the set row.
  const [updated, set] = await Promise.all([
    consolidationRepository.incrementViolationCount(trialId),
    consolidationRepository.findSetById(trial.consolidation_set_id),
  ]);
  const limit = Number(set?.violation_limit ?? 3);

  if (Number(updated.violation_count) >= limit) {
    const finalTrial = await gradeAndFinalize(trialId, 'auto_submitted', updated);
    return { trial: finalTrial, auto_submitted: true };
  }
  return { trial: updated, auto_submitted: false };
};

// --- Public share-link flow -------------------------------------------------

const getPublicSetView = async (shareToken: string) => {
  const set = await consolidationRepository.findPublicSetMeta(shareToken);
  if (!set) return null;
  const words = await consolidationRepository.findWordsBySetPublic(set.consolidation_set_id);
  return {
    consolidation_set_id: set.consolidation_set_id,
    title: set.title,
    class_name: set.class_name,
    session_date: set.session_date,
    violation_limit: set.violation_limit,
    words,
  };
};

const startPublicTrial = async (shareToken: string, username: string, meta: { ipAddress?: string | null; userAgent?: string | null; confirm?: boolean } = {}) => {
  const set = await consolidationRepository.findSetByShareToken(shareToken);
  if (!set) return { error: 'not_found' as const };

  // Identification by username, not a roster pick — knowing a username still isn't
  // proof of identity (same soft-signal tradeoff as before), but it no longer requires
  // publishing the whole class roster's names to anyone holding the link.
  const student = await studentService.findByUsername(String(username || '').trim());
  if (!student) return { error: 'invalid_student' as const };
  const studentId = Number(student.student_id);

  // Independent checks — enrollment doesn't depend on today's completion status —
  // run concurrently instead of as two sequential round trips.
  const [enrolled, existingToday] = await Promise.all([
    isStudentEnrolled(set.class_id, studentId, set.center_id),
    consolidationRepository.findCompletedTrialToday(set.consolidation_set_id, studentId),
  ]);
  if (!enrolled) return { error: 'invalid_student' as const };

  // Surface the "already completed today" nudge BEFORE creating a row — a student who
  // backs out at the confirmation must not leave a stray in_progress trial behind that
  // would otherwise inflate the teacher's results-dashboard trial count for nothing.
  if (existingToday && !meta.confirm) {
    return { needs_confirmation: true as const, existing_today: existingToday };
  }

  // Enrollment already verified above — tell startTrialForSet not to re-check it.
  const started = await startTrialForSet(set, studentId, { viaShareLink: true, ipAddress: meta.ipAddress ?? null, userAgent: meta.userAgent ?? null }, true);
  if ('error' in started) return started;
  return { ...started, existing_today: existingToday };
};

const resolveTrialForToken = async (shareToken: string, trialId: number, trialToken?: string | null) => {
  // Independent lookups (by token, by id) — run concurrently instead of sequentially,
  // and findTrialWithAuth already carries everything the caller needs, so there's no
  // second findTrialById once the checks below pass.
  const [set, trial] = await Promise.all([
    consolidationRepository.findSetByShareToken(shareToken),
    consolidationRepository.findTrialWithAuth(trialId),
  ]);
  if (!set || !trial || Number(trial.consolidation_set_id) !== Number(set.consolidation_set_id)) return null;
  // Bound to the trial the caller actually started — a shareToken plus a guessed/incrementing
  // trialId is not enough to touch another student's in-progress trial on the same set.
  if (!trial.access_token || trial.access_token !== trialToken) return null;
  return { set, trial };
};

module.exports = {
  createSet,
  getSetForTeacher,
  getSetForStudentView,
  getResultsDashboard,
  getConsolidationsOverview,
  getTrial,
  getTrialDetail,
  deleteSet,
  regenerateLink,
  startTrial,
  saveAnswer,
  submitTrial,
  logViolation,
  getPublicSetView,
  startPublicTrial,
  resolveTrialForToken,
};

export {};
