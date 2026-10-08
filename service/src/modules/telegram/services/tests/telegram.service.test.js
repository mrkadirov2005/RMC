jest.mock('../../repositories/telegram.repository', () => ({
  findSessionResults: jest.fn(),
  findMonthScores: jest.fn(),
  findLinkedStudentIds: jest.fn(),
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
    repository.findLinkedStudentIds.mockResolvedValue(new Set([10]));
    repository.findMonthScores.mockResolvedValue([]);

    expect(await service.enqueueLessonResults(77)).toBe(1);
    const [[queued]] = repository.enqueueMessages.mock.calls;
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ studentId: 10, kind: 'lesson_result', centerId: 1 });
    expect(queued[0].text).toContain('Ball: 95/100');
    expect(queued[0].text).toContain('Yulduz');
    expect(repository.findMonthScores).toHaveBeenCalledWith({ centerId: 1, monthStart: '2026-10-01', monthEnd: '2026-11-01' });
  });

  it('does nothing when nobody follows the lesson’s students', async () => {
    repository.findSessionResults.mockResolvedValue([{ main_student_id: 11, center_id: 1 }]);
    repository.findLinkedStudentIds.mockResolvedValue(new Set());
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
