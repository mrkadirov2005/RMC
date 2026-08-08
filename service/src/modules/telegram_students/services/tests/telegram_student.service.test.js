jest.mock('../../repositories/telegram_student.repository', () => ({
  resolveStudent: jest.fn(), findLastLesson: jest.fn(), centerRankSummary: jest.fn(), classRankSummary: jest.fn(), results: jest.fn(), payments: jest.fn(),
}));
const repository = require('../../repositories/telegram_student.repository');
const service = require('../telegram_student.service');
const student = { student_id: 1, center_id: 2, class_id: 3, first_name: 'Ali', last_name: 'Vali', coins: '7', class_name: 'A' };

describe('telegram student service', () => {
  beforeEach(() => { jest.clearAllMocks(); repository.resolveStudent.mockResolvedValue(student); });
  test('rejects missing and unknown Telegram identities', async () => {
    await expect(service.menu('')).rejects.toMatchObject({ status: 400 });
    repository.resolveStudent.mockResolvedValue(null);
    await expect(service.menu('unknown')).rejects.toMatchObject({ status: 404 });
  });
  test('builds menu and empty-last-lesson profiles', async () => {
    const menu = await service.menu('tg1'); expect(menu.student).toMatchObject({ student_id: 1, name: 'Ali Vali', coins: 7 }); expect(menu.menus).toHaveLength(4);
    repository.findLastLesson.mockResolvedValue(null);
    await expect(service.lastLesson('tg1')).resolves.toMatchObject({ lesson: null });
  });
  test('normalizes ranking scope and numeric summary', async () => {
    repository.centerRankSummary.mockResolvedValue({ rank: '2', total_students: '10', coins: '7', points: '90' });
    const result = await service.rankings('tg1', 'center');
    expect(result).toMatchObject({ scope: 'center', ranking: { rank: 2, total_students: 10, coins: 7, points: 90 } });
  });
  test('clamps result and payment pagination limits', async () => {
    repository.results.mockResolvedValue({ data: [], total: 0, page: 1, limit: 30 });
    repository.payments.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    await service.results('tg1', -1, 100); await service.payments('tg1', -1, 100);
    expect(repository.results).toHaveBeenCalledWith(1, 1, 30);
    expect(repository.payments).toHaveBeenCalledWith(1, 2, 1, 20);
  });
});
