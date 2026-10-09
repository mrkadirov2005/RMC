jest.mock('../../repositories/watchlist.repository', () => ({
  findActive: jest.fn(),
  findStudentCenter: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  softRemove: jest.fn(),
}));
jest.mock('../../../telegram/repositories/telegram.repository', () => ({ findMonthScores: jest.fn() }));

const repository = require('../../repositories/watchlist.repository');
const telegramRepository = require('../../../telegram/repositories/telegram.repository');
const service = require('../watchlist.service');

const lesson = (classId, mainStudentId, score) => ({ class_id: classId, main_student_id: mainStudentId, attendance_score: score });

describe('watchlist service', () => {
  beforeEach(() => jest.clearAllMocks());

  it("rates each watched student by this month's lessons, per branch", async () => {
    repository.findActive.mockResolvedValue([
      { watch_id: 1, center_id: 4, class_id: 10, main_student_id: 2 },
      { watch_id: 2, center_id: 5, class_id: 20, main_student_id: 9 },
    ]);
    telegramRepository.findMonthScores.mockImplementation(async ({ centerId }) => (centerId === 4
      ? [lesson(10, 1, 90), lesson(10, 2, 60), lesson(10, 2, 80), lesson(10, 3, 40), lesson(11, 4, 200)]
      : []));

    const rows = await service.list(undefined, new Date('2026-10-09T08:00:00Z'));

    expect(telegramRepository.findMonthScores).toHaveBeenCalledWith({ centerId: 4, monthStart: '2026-10-01', monthEnd: '2026-11-01' });
    expect(rows[0].rating).toEqual({ group_place: 1, group_size: 3, center_place: 2, lessons_scored: 2, average_score: 70 });
    expect(rows[1].rating).toEqual({ group_place: null, group_size: 0, center_place: null, lessons_scored: 0, average_score: null });
  });

  it('adds a student from the caller\'s branch with whom to inform', async () => {
    repository.findStudentCenter.mockResolvedValue(4);
    repository.insert.mockResolvedValue({ watch_id: 3 });
    await expect(service.add({ student_id: 2, contact_name: '  Otasi Vali  ', contact_phone: '+998901234567' }, 4, 'Admin')).resolves.toEqual({ row: { watch_id: 3 } });
    expect(repository.findStudentCenter).toHaveBeenCalledWith(2, 4);
    expect(repository.insert).toHaveBeenCalledWith({ centerId: 4, studentId: 2, contactName: 'Otasi Vali', contactPhone: '+998901234567', note: null, addedByName: 'Admin' });
  });

  it('refuses a missing contact, another branch, and a student already on the list', async () => {
    expect(await service.add({ student_id: 2, contact_name: ' ' }, 4, null)).toEqual({ error: 'contact_required' });
    repository.findStudentCenter.mockResolvedValue(null);
    expect(await service.add({ student_id: 2, contact_name: 'Ota' }, 4, null)).toEqual({ error: 'student_not_found' });
    repository.findStudentCenter.mockResolvedValue(4);
    repository.insert.mockResolvedValue(null);
    expect(await service.add({ student_id: 2, contact_name: 'Ota' }, 4, null)).toEqual({ error: 'already_watched' });
  });
});
