const transaction = jest.fn((handler) => handler('tx'));
jest.mock('../../../../db/pool', () => ({ db: { transaction } }));
jest.mock('../../repositories/consolidation.repository', () => ({
  findSessionMeta: jest.fn(),
  findSetBySession: jest.fn(),
  findSetById: jest.fn(),
  findSetByShareToken: jest.fn(),
  findPublicSetMeta: jest.fn(),
  insertSet: jest.fn(),
  insertWords: jest.fn(),
  findWordsBySet: jest.fn(),
  findWordsBySetPublic: jest.fn(),
  softDeleteSet: jest.fn(),
  updateShareToken: jest.fn(),
  countTrialsForSet: jest.fn(),
  findTrialsForSet: jest.fn(),
  findTrialsByStudentAndSet: jest.fn(),
  findTrialById: jest.fn(),
  findTrialWithAuth: jest.fn(),
  countTrialsByStudentForSet: jest.fn(),
  findCompletedTrialToday: jest.fn(),
  insertTrial: jest.fn(),
  incrementViolationCount: jest.fn(),
  finalizeTrial: jest.fn(),
  upsertAnswer: jest.fn(),
  findAnswersByTrial: jest.fn(),
  setAnswerCorrectness: jest.fn(),
}));
jest.mock('../../../students/services/student.service', () => ({
  listClassStudentsWithTransfers: jest.fn(),
}));

const consolidationRepository = require('../../repositories/consolidation.repository');
const studentService = require('../../../students/services/student.service');
const service = require('../consolidation.service');

describe('consolidation service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockImplementation((handler) => handler('tx'));
  });

  describe('createSet — teacher-ownership and duplicate-set boundaries', () => {
    const session = { session_id: 10, center_id: 2, class_id: 5, teacher_id: 7 };

    it('rejects when the session does not exist', async () => {
      consolidationRepository.findSessionMeta.mockResolvedValue(null);
      const result = await service.createSet({ session_id: 10, words: [] }, { userType: 'teacher', teacherId: 7, centerId: 2 });
      expect(result).toEqual({ error: 'session_not_found' });
    });

    it('rejects a teacher who does not teach this session', async () => {
      consolidationRepository.findSessionMeta.mockResolvedValue(session);
      consolidationRepository.findSetBySession.mockResolvedValue(null);
      const result = await service.createSet({ session_id: 10, words: [] }, { userType: 'teacher', teacherId: 999, centerId: 2 });
      expect(result).toEqual({ error: 'forbidden' });
    });

    it('rejects a session belonging to a different center', async () => {
      consolidationRepository.findSessionMeta.mockResolvedValue(session);
      const result = await service.createSet({ session_id: 10, words: [] }, { userType: 'superuser', centerId: 999 });
      expect(result).toEqual({ error: 'session_not_found' });
    });

    it('rejects creating a second set for a session that already has one', async () => {
      consolidationRepository.findSessionMeta.mockResolvedValue(session);
      consolidationRepository.findSetBySession.mockResolvedValue({ consolidation_set_id: 1 });
      const result = await service.createSet({ session_id: 10, words: [] }, { userType: 'teacher', teacherId: 7, centerId: 2 });
      expect(result).toEqual({ error: 'already_exists' });
      expect(consolidationRepository.insertSet).not.toHaveBeenCalled();
    });

    it('assigns sequential word_order and creates the set inside a transaction', async () => {
      consolidationRepository.findSessionMeta.mockResolvedValue(session);
      consolidationRepository.findSetBySession.mockResolvedValue(null);
      consolidationRepository.insertSet.mockResolvedValue({ consolidation_set_id: 55, session_id: 10 });
      consolidationRepository.insertWords.mockResolvedValue([{ consolidation_word_id: 1 }]);

      const words = [{ main_word: 'salom', translations: ['hello'] }, { main_word: 'rahmat', translations: ['thanks'] }];
      const result = await service.createSet({ session_id: 10, title: 'Unit 5', words }, { userType: 'teacher', teacherId: 7, centerId: 2 });

      expect(result.set.consolidation_set_id).toBe(55);
      const insertedWords = consolidationRepository.insertWords.mock.calls[0][1];
      expect(insertedWords.map((w) => w.word_order)).toEqual([1, 2]);
    });
  });

  describe('getSetForStudentView — enrollment boundary', () => {
    it('returns forbidden for a student not on the class roster', async () => {
      consolidationRepository.findSetBySession.mockResolvedValue({ consolidation_set_id: 1, class_id: 5 });
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 1 }, { student_id: 2 }]);
      const result = await service.getSetForStudentView(10, 2, 999);
      expect(result).toEqual({ error: 'forbidden' });
    });

    it('returns the word list without translations for an enrolled student', async () => {
      consolidationRepository.findSetBySession.mockResolvedValue({ consolidation_set_id: 1, class_id: 5, title: 'Unit 5', violation_limit: 3 });
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 999 }]);
      consolidationRepository.findWordsBySetPublic.mockResolvedValue([{ consolidation_word_id: 1, word_order: 1, main_word: 'salom' }]);
      const result = await service.getSetForStudentView(10, 2, 999);
      expect(result.words).toEqual([{ consolidation_word_id: 1, word_order: 1, main_word: 'salom' }]);
    });
  });

  describe('getResultsDashboard — fixture-based count assertions', () => {
    // Fixture: a 4-student roster. Alice has two trials (one failed, one passed —
    // best must pick the passed one even though it wasn't the most recent). Bob has
    // one failed trial via the share link (should carry the via_share_link flag).
    // Carol has never attempted it. Dave isn't in the trials table at all.
    const set = { consolidation_set_id: 1, class_id: 5, teacher_id: 7 };
    const roster = [
      { student_id: 1, first_name: 'Alice', last_name: 'A' },
      { student_id: 2, first_name: 'Bob', last_name: 'B' },
      { student_id: 3, first_name: 'Carol', last_name: 'C' },
      { student_id: 4, first_name: 'Dave', last_name: 'D' },
    ];
    // findTrialsForSet is documented to return newest-first (ORDER BY started_at DESC).
    const trials = [
      { trial_id: 30, student_id: 1, correct_count: 10, total_words: 10, is_passed: true, via_share_link: false, started_at: '2026-09-05T09:00:00Z' },
      { trial_id: 20, student_id: 2, correct_count: 3, total_words: 10, is_passed: false, via_share_link: true, started_at: '2026-09-04T09:00:00Z' },
      { trial_id: 10, student_id: 1, correct_count: 6, total_words: 10, is_passed: false, via_share_link: false, started_at: '2026-09-03T09:00:00Z' },
    ];

    it('computes per-student trial_count, best (highest-scoring, not just latest), latest, and the overall summary', async () => {
      consolidationRepository.findSetBySession.mockResolvedValue(set);
      studentService.listClassStudentsWithTransfers.mockResolvedValue(roster);
      consolidationRepository.findTrialsForSet.mockResolvedValue(trials);

      const result = await service.getResultsDashboard(10, 2, { userType: 'teacher', teacherId: 7 });

      expect(result.summary).toEqual({ total: 4, submitted: 2 });

      const alice = result.rows.find((row) => row.student_id === 1);
      expect(alice.trial_count).toBe(2);
      expect(alice.submitted).toBe(true);
      expect(alice.best_trial.trial_id).toBe(30); // the passed 10/10, not trial 10's 6/10
      expect(alice.latest_trial.trial_id).toBe(30); // newest-first order preserved

      const bob = result.rows.find((row) => row.student_id === 2);
      expect(bob.trial_count).toBe(1);
      expect(bob.latest_trial.via_share_link).toBe(true);

      const carol = result.rows.find((row) => row.student_id === 3);
      expect(carol.trial_count).toBe(0);
      expect(carol.submitted).toBe(false);
      expect(carol.best_trial).toBeNull();
      expect(carol.latest_trial).toBeNull();

      const dave = result.rows.find((row) => row.student_id === 4);
      expect(dave.submitted).toBe(false);
    });
  });

  describe('trial numbering — sequential and race-safe via the repository unique index', () => {
    it('starts trial_number at 1 for a student with no prior trials', async () => {
      const set = { consolidation_set_id: 1, class_id: 5, center_id: 2, violation_limit: 3 };
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 3 }]);
      consolidationRepository.countTrialsByStudentForSet.mockResolvedValue(0);
      consolidationRepository.insertTrial.mockResolvedValue({ trial_id: 1, trial_number: 1 });
      consolidationRepository.findWordsBySetPublic.mockResolvedValue([]);
      consolidationRepository.findSetById.mockResolvedValue(set);

      await service.startTrial(1, 3, 2);

      expect(consolidationRepository.insertTrial).toHaveBeenCalledWith(expect.objectContaining({ trialNumber: 1 }), 'tx');
    });

    it("this student's Nth attempt gets trial_number N", async () => {
      const set = { consolidation_set_id: 1, class_id: 5, center_id: 2, violation_limit: 3 };
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 3 }]);
      consolidationRepository.countTrialsByStudentForSet.mockResolvedValue(4);
      consolidationRepository.insertTrial.mockResolvedValue({ trial_id: 5, trial_number: 5 });
      consolidationRepository.findWordsBySetPublic.mockResolvedValue([]);
      consolidationRepository.findSetById.mockResolvedValue(set);

      await service.startTrial(1, 3, 2);

      expect(consolidationRepository.insertTrial).toHaveBeenCalledWith(expect.objectContaining({ trialNumber: 5 }), 'tx');
    });

    it('rejects starting a trial for a student not enrolled in the class', async () => {
      consolidationRepository.findSetById.mockResolvedValue({ consolidation_set_id: 1, class_id: 5, center_id: 2 });
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 1 }]);
      const result = await service.startTrial(1, 999, 2);
      expect(result).toEqual({ error: 'forbidden' });
      expect(consolidationRepository.insertTrial).not.toHaveBeenCalled();
    });
  });

  describe('submitTrial / auto-submit-on-violation grading', () => {
    const trial = { trial_id: 1, consolidation_set_id: 1, status: 'in_progress', started_at: new Date(Date.now() - 5000) };
    const words = [
      { consolidation_word_id: 1, translations: ['salom', 'assalom'] },
      { consolidation_word_id: 2, translations: ['rahmat'] },
    ];

    it('marks a trial fully correct as passed', async () => {
      consolidationRepository.findTrialById.mockResolvedValue(trial);
      consolidationRepository.findWordsBySet.mockResolvedValue(words);
      consolidationRepository.findAnswersByTrial.mockResolvedValue([
        { consolidation_word_id: 1, answer_id: 100, student_answer: 'Salom' },
        { consolidation_word_id: 2, answer_id: 101, student_answer: 'rahmat' },
      ]);
      consolidationRepository.finalizeTrial.mockResolvedValue({ trial_id: 1, status: 'completed', correct_count: 2, total_words: 2, is_passed: true });

      await service.submitTrial(1);

      expect(consolidationRepository.setAnswerCorrectness).toHaveBeenCalledWith(100, true);
      expect(consolidationRepository.setAnswerCorrectness).toHaveBeenCalledWith(101, true);
      expect(consolidationRepository.finalizeTrial).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'completed', correctCount: 2, totalWords: 2, isPassed: true,
      }));
    });

    it('a partially-answered trial fails but still grades what was answered', async () => {
      consolidationRepository.findTrialById.mockResolvedValue(trial);
      consolidationRepository.findWordsBySet.mockResolvedValue(words);
      consolidationRepository.findAnswersByTrial.mockResolvedValue([
        { consolidation_word_id: 1, answer_id: 100, student_answer: 'salom' },
      ]);
      consolidationRepository.finalizeTrial.mockResolvedValue({ trial_id: 1, status: 'auto_submitted', correct_count: 1, total_words: 2, is_passed: false });

      const set = { consolidation_set_id: 1, violation_limit: 1 };
      consolidationRepository.findSetById.mockResolvedValue(set);
      consolidationRepository.incrementViolationCount.mockResolvedValue({ trial_id: 1, consolidation_set_id: 1, status: 'in_progress', started_at: trial.started_at, violation_count: 1 });

      const result = await service.logViolation(1);

      expect(result.auto_submitted).toBe(true);
      expect(consolidationRepository.finalizeTrial).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'auto_submitted', correctCount: 1, totalWords: 2, isPassed: false,
      }));
    });

    it('does not auto-submit before the violation limit is reached', async () => {
      consolidationRepository.findTrialById.mockResolvedValue(trial);
      consolidationRepository.findSetById.mockResolvedValue({ consolidation_set_id: 1, violation_limit: 3 });
      consolidationRepository.incrementViolationCount.mockResolvedValue({ trial_id: 1, consolidation_set_id: 1, status: 'in_progress', started_at: trial.started_at, violation_count: 1 });

      const result = await service.logViolation(1);

      expect(result.auto_submitted).toBe(false);
      expect(consolidationRepository.finalizeTrial).not.toHaveBeenCalled();
    });

    it('is idempotent — submitting an already-completed trial does not re-grade', async () => {
      consolidationRepository.findTrialById.mockResolvedValue({ ...trial, status: 'completed' });
      const result = await service.submitTrial(1);
      expect(result.status).toBe('completed');
      expect(consolidationRepository.finalizeTrial).not.toHaveBeenCalled();
    });
  });

  describe('deleteSet — trial-existence guard', () => {
    it('refuses to delete a set that already has trials', async () => {
      consolidationRepository.findSetById.mockResolvedValue({ consolidation_set_id: 1, teacher_id: 7 });
      consolidationRepository.countTrialsForSet.mockResolvedValue(2);
      const result = await service.deleteSet(1, 2, { userType: 'teacher', teacherId: 7 });
      expect(result).toEqual({ error: 'has_trials' });
      expect(consolidationRepository.softDeleteSet).not.toHaveBeenCalled();
    });

    it('soft-deletes a set with zero trials', async () => {
      consolidationRepository.findSetById.mockResolvedValue({ consolidation_set_id: 1, teacher_id: 7 });
      consolidationRepository.countTrialsForSet.mockResolvedValue(0);
      consolidationRepository.softDeleteSet.mockResolvedValue({ consolidation_set_id: 1, deleted_at: new Date() });
      const result = await service.deleteSet(1, 2, { userType: 'teacher', teacherId: 7 });
      expect(result.deleted_at).toBeTruthy();
    });
  });

  describe('teacher-ownership boundary on mutating/dashboard endpoints (a second teacher in the same center)', () => {
    const set = { consolidation_set_id: 1, class_id: 5, teacher_id: 7 };
    const otherTeacher = { userType: 'teacher', teacherId: 999 };

    it('deleteSet refuses a teacher who does not teach this session, even within the same center', async () => {
      consolidationRepository.findSetById.mockResolvedValue(set);
      const result = await service.deleteSet(1, 2, otherTeacher);
      expect(result).toEqual({ error: 'forbidden' });
      expect(consolidationRepository.countTrialsForSet).not.toHaveBeenCalled();
    });

    it('regenerateLink refuses a teacher who does not teach this session', async () => {
      consolidationRepository.findSetById.mockResolvedValue(set);
      const result = await service.regenerateLink(1, 2, otherTeacher);
      expect(result).toEqual({ error: 'forbidden' });
      expect(consolidationRepository.updateShareToken).not.toHaveBeenCalled();
    });

    it('getSetForTeacher refuses a teacher who does not teach this session', async () => {
      consolidationRepository.findSetBySession.mockResolvedValue(set);
      const result = await service.getSetForTeacher(10, 2, otherTeacher);
      expect(result).toEqual({ error: 'forbidden' });
    });

    it('getResultsDashboard refuses a teacher who does not teach this session', async () => {
      consolidationRepository.findSetBySession.mockResolvedValue(set);
      const result = await service.getResultsDashboard(10, 2, otherTeacher);
      expect(result).toEqual({ error: 'forbidden' });
      expect(studentService.listClassStudentsWithTransfers).not.toHaveBeenCalled();
    });

    it('a superuser is not subject to the teacher-ownership check', async () => {
      consolidationRepository.findSetById.mockResolvedValue(set);
      consolidationRepository.countTrialsForSet.mockResolvedValue(0);
      consolidationRepository.softDeleteSet.mockResolvedValue({ ...set, deleted_at: new Date() });
      const result = await service.deleteSet(1, 2, { userType: 'superuser' });
      expect(result.deleted_at).toBeTruthy();
    });
  });

  describe('getTrialDetail — cross-tenant boundary for non-student callers', () => {
    it('rejects a teacher/superuser from a different center', async () => {
      consolidationRepository.findTrialById.mockResolvedValue({ trial_id: 1, student_id: 3, center_id: 2, consolidation_set_id: 1 });
      const result = await service.getTrialDetail(1, { userType: 'teacher', id: 999, centerId: 999 });
      expect(result).toEqual({ error: 'forbidden' });
    });

    it('allows a teacher/superuser in the same center', async () => {
      consolidationRepository.findTrialById.mockResolvedValue({ trial_id: 1, student_id: 3, center_id: 2, consolidation_set_id: 1 });
      consolidationRepository.findWordsBySet.mockResolvedValue([]);
      consolidationRepository.findAnswersByTrial.mockResolvedValue([]);
      const result = await service.getTrialDetail(1, { userType: 'teacher', id: 7, centerId: 2 });
      expect(result.error).toBeUndefined();
    });

    it('still rejects a student who does not own the trial, regardless of center', async () => {
      consolidationRepository.findTrialById.mockResolvedValue({ trial_id: 1, student_id: 3, center_id: 2, consolidation_set_id: 1 });
      const result = await service.getTrialDetail(1, { userType: 'student', id: 999, centerId: 2 });
      expect(result).toEqual({ error: 'forbidden' });
    });
  });

  describe('trial-numbering race — retries once on a unique-constraint collision', () => {
    it('retries with a fresh count when two concurrent starts collide on trial_number', async () => {
      const set = { consolidation_set_id: 1, class_id: 5, center_id: 2 };
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 3 }]);
      consolidationRepository.findSetById.mockResolvedValue(set);
      consolidationRepository.countTrialsByStudentForSet
        .mockResolvedValueOnce(0) // first attempt reads a stale count
        .mockResolvedValueOnce(1); // retry re-reads after the loser's collision
      const uniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' });
      consolidationRepository.insertTrial
        .mockRejectedValueOnce(uniqueViolation)
        .mockResolvedValueOnce({ trial_id: 2, trial_number: 2 });
      consolidationRepository.findWordsBySetPublic.mockResolvedValue([]);

      const result = await service.startTrial(1, 3, 2);

      expect(consolidationRepository.insertTrial).toHaveBeenCalledTimes(2);
      expect(result.trial.trial_number).toBe(2);
    });

    it('rethrows a non-collision database error without retrying', async () => {
      const set = { consolidation_set_id: 1, class_id: 5, center_id: 2 };
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 3 }]);
      consolidationRepository.findSetById.mockResolvedValue(set);
      consolidationRepository.countTrialsByStudentForSet.mockResolvedValue(0);
      consolidationRepository.insertTrial.mockRejectedValue(new Error('connection reset'));

      await expect(service.startTrial(1, 3, 2)).rejects.toThrow('connection reset');
      expect(consolidationRepository.insertTrial).toHaveBeenCalledTimes(1);
    });
  });

  describe('public share-link scoping', () => {
    it('rejects a student_id not present on the token-resolved roster', async () => {
      consolidationRepository.findSetByShareToken.mockResolvedValue({ consolidation_set_id: 1, class_id: 5, center_id: 2 });
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 1 }]);
      const result = await service.startPublicTrial('tok123', 999, {});
      expect(result).toEqual({ error: 'invalid_student' });
    });

    it('returns not_found for an unknown or deleted-set token', async () => {
      consolidationRepository.findSetByShareToken.mockResolvedValue(null);
      const result = await service.startPublicTrial('bad-token', 1, {});
      expect(result).toEqual({ error: 'not_found' });
    });

    it('holds back trial creation and asks for confirmation when the student already completed one today', async () => {
      const set = { consolidation_set_id: 1, class_id: 5, center_id: 2 };
      consolidationRepository.findSetByShareToken.mockResolvedValue(set);
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 3 }]);
      const existingToday = { trial_id: 5, status: 'completed', correct_count: 8, total_words: 10 };
      consolidationRepository.findCompletedTrialToday.mockResolvedValue(existingToday);

      const result = await service.startPublicTrial('tok123', 3, {});

      expect(result).toEqual({ needs_confirmation: true, existing_today: existingToday });
      expect(consolidationRepository.insertTrial).not.toHaveBeenCalled();
    });

    it('creates the trial anyway once the student confirms past the already-completed-today nudge', async () => {
      const set = { consolidation_set_id: 1, class_id: 5, center_id: 2 };
      consolidationRepository.findSetByShareToken.mockResolvedValue(set);
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 3 }]);
      consolidationRepository.findCompletedTrialToday.mockResolvedValue({ trial_id: 5, status: 'completed' });
      consolidationRepository.countTrialsByStudentForSet.mockResolvedValue(1);
      consolidationRepository.insertTrial.mockResolvedValue({ trial_id: 6, trial_number: 2, access_token: 'tok' });
      consolidationRepository.findWordsBySetPublic.mockResolvedValue([]);

      const result = await service.startPublicTrial('tok123', 3, { confirm: true });

      expect(consolidationRepository.insertTrial).toHaveBeenCalled();
      expect(result.trial.trial_id).toBe(6);
    });

    it('creates the trial immediately when there is no completed-today trial to nudge about', async () => {
      const set = { consolidation_set_id: 1, class_id: 5, center_id: 2 };
      consolidationRepository.findSetByShareToken.mockResolvedValue(set);
      studentService.listClassStudentsWithTransfers.mockResolvedValue([{ student_id: 3 }]);
      consolidationRepository.findCompletedTrialToday.mockResolvedValue(null);
      consolidationRepository.countTrialsByStudentForSet.mockResolvedValue(0);
      consolidationRepository.insertTrial.mockResolvedValue({ trial_id: 1, trial_number: 1, access_token: 'tok' });
      consolidationRepository.findWordsBySetPublic.mockResolvedValue([]);

      const result = await service.startPublicTrial('tok123', 3, {});

      expect(consolidationRepository.insertTrial).toHaveBeenCalled();
      expect(result.trial.trial_id).toBe(1);
    });

    it('resolveTrialForToken rejects a trial that belongs to a different set than the token', async () => {
      consolidationRepository.findSetByShareToken.mockResolvedValue({ consolidation_set_id: 1 });
      consolidationRepository.findTrialWithAuth.mockResolvedValue({ trial_id: 9, consolidation_set_id: 2, access_token: 'secret' });
      const result = await service.resolveTrialForToken('tokA', 9, 'secret');
      expect(result).toBeNull();
    });

    it('resolveTrialForToken rejects a correctly-scoped trial when the trial_token does not match', async () => {
      consolidationRepository.findSetByShareToken.mockResolvedValue({ consolidation_set_id: 1 });
      consolidationRepository.findTrialWithAuth.mockResolvedValue({ trial_id: 9, consolidation_set_id: 1, access_token: 'secret-for-student-a' });
      const result = await service.resolveTrialForToken('tokA', 9, 'guessed-or-another-students-token');
      expect(result).toBeNull();
      expect(consolidationRepository.findTrialById).not.toHaveBeenCalled();
    });

    it('resolveTrialForToken accepts a trial that matches both the token-resolved set and its own access token, with no second lookup', async () => {
      consolidationRepository.findSetByShareToken.mockResolvedValue({ consolidation_set_id: 1 });
      consolidationRepository.findTrialWithAuth.mockResolvedValue({ trial_id: 9, consolidation_set_id: 1, access_token: 'secret' });
      const result = await service.resolveTrialForToken('tokA', 9, 'secret');
      expect(result).not.toBeNull();
      expect(consolidationRepository.findTrialById).not.toHaveBeenCalled();
    });
  });
});
