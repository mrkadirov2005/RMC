jest.mock('../../../students/services/student.service', () => ({
  listLinkedGroups: jest.fn(),
  getStudent: jest.fn(),
  getCoinSummary: jest.fn(),
}));
jest.mock('../../../attendance/services/attendance.service', () => ({ byStudent: jest.fn() }));
jest.mock('../../../debts/services/debt.service', () => ({ listByStudent: jest.fn() }));
jest.mock('../../../payments/services/payment.service', () => ({ listByStudent: jest.fn() }));
jest.mock('../../../rooms/repositories/rooms.repository', () => ({ findByClassId: jest.fn() }));
jest.mock('../../../telegram_students/repositories/telegram_student.repository', () => ({
  results: jest.fn(),
  classRank: jest.fn(),
  centerRank: jest.fn(),
}));
jest.mock('../../repositories/mobileSession.repository', () => ({}));

const studentService = require('../../../students/services/student.service');
const attendanceService = require('../../../attendance/services/attendance.service');
const debtService = require('../../../debts/services/debt.service');
const paymentService = require('../../../payments/services/payment.service');
const roomsRepository = require('../../../rooms/repositories/rooms.repository');
const telegramRepo = require('../../../telegram_students/repositories/telegram_student.repository');
const learner = require('../mobileLearner.service');

const main = { student_id: 7, first_name: 'Aziza', last_name: 'K', center_id: 2, class_id: 3, class_name: 'B1', status: 'Active', is_main: true, teacher_first_name: 'Temur', teacher_last_name: 'A' };
const second = { student_id: 8, first_name: 'Aziza', last_name: 'K', center_id: 2, class_id: 4, class_name: 'IELTS', status: 'Active', is_main: false };
const transferred = { student_id: 9, class_id: 5, class_name: 'Old', status: 'Transferred', is_main: false };

describe('mobile learner service', () => {
  beforeEach(() => {
    studentService.listLinkedGroups.mockResolvedValue([main, second, transferred]);
  });

  // @MOB-026
  it('profile lists every group except transferred ones, with the teacher name', async () => {
    const profile = await learner.profile(8, 2);

    expect(profile).toMatchObject({ student_id: 7, first_name: 'Aziza', center_id: 2 });
    expect(profile.groups.map((g) => g.class_name)).toEqual(['B1', 'IELTS']);
    expect(profile.groups[0].teacher_name).toBe('Temur A');
  });

  it('profile falls back to the single record, or null when the student is gone', async () => {
    studentService.listLinkedGroups.mockResolvedValue([]);
    studentService.getStudent.mockResolvedValueOnce({ ...main, is_main: undefined });
    await expect(learner.profile(7, 2)).resolves.toMatchObject({ student_id: 7, groups: [expect.objectContaining({ is_main: true })] });

    studentService.getStudent.mockResolvedValueOnce(null);
    await expect(learner.profile(7, 2)).resolves.toBeNull();
  });

  // @MOB-027
  it('attendance merges every group record newest first and counts late as present', async () => {
    attendanceService.byStudent.mockImplementation(async (id) =>
      id === 7
        ? [{ attendance_date: '2026-10-01', status: 'Present' }, { attendance_date: '2026-10-03', status: 'Absent NR' }]
        : id === 8
          ? [{ attendance_date: '2026-10-02', status: 'Late' }, { attendance_date: '2026-10-04', status: 'Excused' }]
          : [],
    );

    const result = await learner.attendance(7, 2, 1, 2);

    expect(result.summary).toEqual({ total: 4, present: 2, absent: 1, excused: 1, rate: 67 });
    expect(result.items.map((r) => r.attendance_date)).toEqual(['2026-10-04', '2026-10-03']);
    expect(result.total).toBe(4);
  });

  it('attendance rate is 0 with no counted lessons', async () => {
    attendanceService.byStudent.mockResolvedValue([]);
    await expect(learner.attendance(7, 2, 1, 20)).resolves.toMatchObject({ summary: { total: 0, rate: 0 } });
  });

  it('attendanceKind sorts the status values', () => {
    expect(['Present', 'Late', 'Excused', 'Absent', 'Absent R', 'Other'].map(learner.attendanceKind)).toEqual([
      'present', 'present', 'excused', 'absent', 'absent', 'other',
    ]);
  });

  // @MOB-027
  it('schedule returns the slots of active groups only', async () => {
    roomsRepository.findByClassId.mockImplementation(async (classId) => [{ day: 'Monday', time: '14:00', endTime: '15:30', roomNumber: `R${classId}` }]);

    const { items } = await learner.schedule(7, 2);

    expect(roomsRepository.findByClassId).toHaveBeenCalledTimes(2);
    expect(items).toEqual([
      { class_id: 3, class_name: 'B1', teacher_name: 'Temur A', day: 'Monday', start_time: '14:00', end_time: '15:30', room: 'R3' },
      { class_id: 4, class_name: 'IELTS', teacher_name: null, day: 'Monday', start_time: '14:00', end_time: '15:30', room: 'R4' },
    ]);
  });

  // @MOB-028
  it('grades keep monthly averages per group so groups are never mixed', async () => {
    telegramRepo.results.mockImplementation(async (id) => ({
      data:
        id === 7
          ? [
              { grade_id: 1, session_date: '2026-09-10', class_name: 'B1', percentage: '80', marks_obtained: '8', total_marks: '10', total_daily_coin: 5 },
              { grade_id: 2, session_date: '2026-09-20', class_name: 'B1', percentage: '60' },
            ]
          : id === 8
            ? [{ grade_id: 3, session_date: '2026-09-15', class_name: 'IELTS', percentage: '90' }, { grade_id: 4, session_date: '', class_name: 'IELTS', percentage: null }]
            : [],
    }));

    const result = await learner.grades(7, 2, 1, 10);

    expect(result.monthly).toEqual([
      { class_name: 'B1', month: '2026-09', average: 70, lessons: 2 },
      { class_name: 'IELTS', month: '2026-09', average: 90, lessons: 1 },
    ]);
    expect(result.items[0]).toMatchObject({ grade_id: 2, date: '2026-09-20' });
    expect(result.items.find((i) => i.grade_id === 1)).toMatchObject({ marks_obtained: 8, total_marks: 10, percentage: 80, coins: 5 });
    expect(result.total).toBe(4);
  });

  // @MOB-029
  it('coins add up the balance of every group record', async () => {
    studentService.getCoinSummary.mockImplementation(async (id) =>
      id === 9 ? null : { balance: id === 7 ? 100 : 40, transactions: [{ transaction_id: id, delta: 5, created_at: `2026-10-0${id - 6}` }] },
    );

    const result = await learner.coins(7, 2, 1, 20);

    expect(result.balance).toBe(140);
    expect(result.items.map((t) => t.transaction_id)).toEqual([8, 7]);
  });

  // @MOB-030
  it('payments report open debts, the earliest due date and the history', async () => {
    paymentService.listByStudent.mockImplementation(async (id) =>
      id === 7 ? [{ payment_id: 1, payment_date: '2026-09-02', final_amount: '480000', payment_method: 'cash' }] : [],
    );
    debtService.listByStudent.mockImplementation(async (id) =>
      id === 7
        ? [{ debt_id: 1, balance: '480000', due_date: '2026-11-05' }, { debt_id: 2, balance: '0' }]
        : id === 8
          ? [{ debt_id: 3, balance: null, debt_amount: '300000', amount_paid: '100000', due_date: '2026-11-01' }]
          : [],
    );

    const result = await learner.payments(7, 2, 1, 20);

    expect(result.outstanding).toBe(680000);
    expect(result.next_due_date).toBe('2026-11-01');
    expect(result.open_debts.map((d) => d.debt_id)).toEqual([1, 3]);
    expect(result.items).toEqual([expect.objectContaining({ payment_id: 1, amount: 480000, currency: 'UZS', date: '2026-09-02' })]);
  });

  // @MOB-031
  it('leaderboard shows first name, last initial and coins only', async () => {
    studentService.getStudent.mockResolvedValue({ student_id: 7, class_id: 3 });
    telegramRepo.classRank.mockResolvedValue([
      { student_id: 5, first_name: 'Bobur', last_name: 'Tursunov', coins: 130, rank: 1, status: 'Active', points: 99 },
      { student_id: 7, first_name: 'Aziza', last_name: 'Karimova', coins: 120, rank: 2, status: 'Active' },
      { student_id: 6, first_name: 'Old', last_name: 'X', coins: 1, rank: 3, status: 'Transferred' },
    ]);

    const result = await learner.leaderboard(7, 2, 'class');

    expect(result.scope).toBe('class');
    expect(result.me).toEqual({ rank: 2, name: 'Aziza K.', coins: 120, is_me: true });
    expect(result.items).toEqual([
      { rank: 1, name: 'Bobur T.', coins: 130, is_me: false },
      { rank: 2, name: 'Aziza K.', coins: 120, is_me: true },
    ]);
  });

  it('leaderboard uses the center scope when asked or when there is no group', async () => {
    telegramRepo.centerRank.mockResolvedValue([]);
    studentService.getStudent.mockResolvedValueOnce({ student_id: 7, class_id: null });
    await expect(learner.leaderboard(7, 2, 'class')).resolves.toMatchObject({ scope: 'center', me: null });

    studentService.getStudent.mockResolvedValueOnce(null);
    await expect(learner.leaderboard(7, 2, 'center')).resolves.toBeNull();
  });

  // @MOB-031
  it('dashboard combines every section, or is null for a missing student', async () => {
    attendanceService.byStudent.mockResolvedValue([]);
    telegramRepo.results.mockResolvedValue({ data: [] });
    studentService.getCoinSummary.mockResolvedValue({ balance: 10, transactions: [] });
    roomsRepository.findByClassId.mockResolvedValue([]);
    paymentService.listByStudent.mockResolvedValue([]);
    debtService.listByStudent.mockResolvedValue([]);

    const result = await learner.dashboard(7, 2);
    expect(result).toMatchObject({ student: { student_id: 7 }, coins: { balance: 30 }, payments: { outstanding: 0, next_due_date: null } });

    studentService.listLinkedGroups.mockResolvedValue([]);
    studentService.getStudent.mockResolvedValue(null);
    await expect(learner.dashboard(7, 2)).resolves.toBeNull();
  });
});
