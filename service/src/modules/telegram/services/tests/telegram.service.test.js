jest.mock('../../repositories/telegram.repository', () => ({
  findSessionResults: jest.fn(),
  findMonthScores: jest.fn(),
  findLinkedStudentIds: jest.fn(),
  findLinkedChats: jest.fn(),
  enqueueMessages: jest.fn((rows) => Promise.resolve(rows.length)),
  findStudent: jest.fn(),
}));
jest.mock('../../../settings/repositories/settings.repository', () => ({ getSetting: jest.fn(), saveSetting: jest.fn() }));
jest.mock('../../../settings/services/settings.service', () => ({
  getLessonScoring: jest.fn(async () => ({ homework: [{ label: 'Good', score: 15 }], activity: [{ label: 'Stellar', score: 40 }] })),
}));

const repository = require('../../repositories/telegram.repository');
const settingsRepository = require('../../../settings/repositories/settings.repository');
const service = require('../telegram.service');

describe('telegram service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queues a lesson result only for students someone follows', async () => {
    repository.findSessionResults.mockResolvedValue([
      { student_id: 10, main_student_id: 10, first_name: 'Ali', center_id: 1, class_id: 3, class_name: 'English', session_date: '2026-10-08', attendance_score: 40, homework_score: 15, activity_score: 40, attendance_status: 'Present', coins_delta: 10, coins_balance: 50 },
      { student_id: 11, main_student_id: 11, first_name: 'Bek', center_id: 1, class_id: 3, class_name: 'English', session_date: '2026-10-08', attendance_score: 0, attendance_status: 'Absent' },
    ]);
    repository.findLinkedChats.mockResolvedValue([{ student_id: 10, telegram_chat_id: 501, role: 'student' }]);
    repository.findMonthScores.mockResolvedValue([]);

    expect(await service.enqueueLessonResults(77)).toBe(1);
    const [[queued]] = repository.enqueueMessages.mock.calls;
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ studentId: 10, kind: 'lesson_result', centerId: 1, telegramChatId: 501 });
    expect(queued[0].text).toContain('Ball: 95/100');
    expect(queued[0].text).toContain('Yulduz');
    expect(repository.findMonthScores).toHaveBeenCalledWith({ centerId: 1, monthStart: '2026-10-01', monthEnd: '2026-11-01' });
  });

  it('sends each parent a formal message by name, and the student the usual one, each to their own chat', async () => {
    repository.findSessionResults.mockResolvedValue([
      { student_id: 10, main_student_id: 10, first_name: 'Ali', last_name: 'Valiyev', center_id: 1, class_id: 3, class_name: 'IELTS B-12', subject_name: 'Ingliz tili', center_name: 'Temurbek', session_date: '2026-10-09', attendance_score: 40, homework_score: 15, activity_score: 40, total_marks: 100, grade_letter: '5', attendance_status: 'Present' },
    ]);
    repository.findLinkedChats.mockResolvedValue([
      { student_id: 10, telegram_chat_id: 501, role: 'student' },
      { student_id: 10, telegram_chat_id: 777, role: 'parent', parent_name: 'Dilnoza Karimova' },
      { student_id: 10, telegram_chat_id: 778, role: 'parent', parent_name: null },
    ]);
    repository.findMonthScores.mockResolvedValue([]);

    expect(await service.enqueueLessonResults(77)).toBe(3);
    const [[queued]] = repository.enqueueMessages.mock.calls;
    const byChat = Object.fromEntries(queued.map((row) => [row.telegramChatId, row]));
    expect(byChat[501]).toMatchObject({ kind: 'lesson_result' });
    expect(byChat[777]).toMatchObject({ kind: 'lesson_result_parent', studentId: 10 });
    expect(byChat[777].text).toContain('Assalomu alaykum, Dilnoza Karimova!');
    expect(byChat[777].text).toContain("Bugun, 09.10.2026, farzandingiz <b>Ali Valiyev</b> Ingliz tili fanidan <b>95/100</b> ball to'pladi (baho: 5).");
    expect(byChat[777].text).toContain("Hurmat bilan, «Temurbek» o'quv markazi ma'muriyati.");
    expect(byChat[778].text).toContain('Assalomu alaykum, hurmatli ota-ona!');
  });

  it('grades a partial lesson out of its real maximum and tells a parent their child was absent', async () => {
    repository.findSessionResults.mockResolvedValue([
      { student_id: 10, main_student_id: 10, first_name: 'Ali', center_id: 1, class_id: 3, class_name: 'Matematika', session_date: '2026-10-09', attendance_score: 40, total_marks: 40, grade_letter: '5', attendance_status: 'Present' },
      { student_id: 11, main_student_id: 11, first_name: 'Bek', center_id: 1, class_id: 3, class_name: 'Matematika', session_date: '2026-10-09', attendance_score: 20, total_marks: 40, grade_letter: '3', attendance_status: 'Absent R' },
    ]);
    repository.findLinkedChats.mockResolvedValue([
      { student_id: 10, telegram_chat_id: 501, role: 'student' },
      { student_id: 11, telegram_chat_id: 902, role: 'parent', parent_name: 'Gulnora' },
    ]);
    repository.findMonthScores.mockResolvedValue([]);

    await service.enqueueLessonResults(77);
    const [[queued]] = repository.enqueueMessages.mock.calls;
    const byChat = Object.fromEntries(queued.map((row) => [row.telegramChatId, row]));
    expect(byChat[501].text).toContain('Ball: 40/40</b> (baho: 5)');
    expect(byChat[902].text).toContain('Matematika fanidan darsga sababli kelmadi.');
    expect(byChat[902].text).not.toContain('ball to');
  });

  it('does nothing when nobody follows the lesson’s students', async () => {
    repository.findSessionResults.mockResolvedValue([{ main_student_id: 11, center_id: 1 }]);
    repository.findLinkedChats.mockResolvedValue([]);
    expect(await service.enqueueLessonResults(77)).toBe(0);
    expect(repository.enqueueMessages).not.toHaveBeenCalled();
  });

  it('sends teacher feedback to a followed child and refuses an empty one', async () => {
    repository.findStudent.mockResolvedValue({ student_id: 12, main_student_id: 10, first_name: 'Ali', last_name: 'V', center_id: 1 });
    repository.findLinkedStudentIds.mockResolvedValue(new Set([10]));
    expect(await service.sendFeedback({ studentId: 12, text: '  ', actingUser: {} })).toEqual({ error: 'empty' });
    expect(await service.sendFeedback({ studentId: 12, text: 'Barakalla!', actingUser: { id: 3, userType: 'teacher' }, senderName: 'Ibrohim M' })).toEqual({ queued: 1, linked: true });
    expect(repository.enqueueMessages.mock.calls[0][0][0]).toMatchObject({ studentId: 10, kind: 'teacher_feedback', createdById: 3 });
  });

  it('reminds each followed child once about the month', async () => {
    repository.findStudent.mockImplementation(async (id) => ({ student_id: id, main_student_id: id === 2 ? 1 : id, first_name: 'S', center_id: 1 }));
    repository.findLinkedStudentIds.mockResolvedValue(new Set([1]));
    const out = await service.sendPaymentReminders({ studentIds: [1, 2, 3], month: '2026-10', actingUser: { id: 2 } });
    expect(out).toEqual({ requested: 3, queued: 1 });
    expect(repository.enqueueMessages.mock.calls[0][0][0].text).toContain('Oktyabr oyi uchun');
  });

  it('keeps bot content tidy', async () => {
    const saved = await service.saveBotContent({ about_director: 'Temurbek', rules: 'Kechikmang', prizes: [{ name: 'Daftar', coins: '50.4' }, { name: '' }] }, 1);
    expect(saved).toEqual({ about_director: 'Temurbek', rules: 'Kechikmang', prizes: [{ name: 'Daftar', coins: 50 }] });
    expect(settingsRepository.saveSetting).toHaveBeenCalledWith('bot_content', saved, 1);
  });
});
