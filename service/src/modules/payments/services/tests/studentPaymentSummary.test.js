jest.mock('../../repositories/payment.repository', () => ({ findStudentPaymentSummary: jest.fn() }));
const repository = require('../../repositories/payment.repository');
const service = require('../payment.service');

describe('student payment summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repository.findStudentPaymentSummary.mockResolvedValue({
      total: '2',
      totals: { students: 3, paid_students: 1, partial_students: 1, unpaid_students: 1, collected: '600000', remaining: '300000' },
      rows: [{ student_id: 1, monthly_fee: '300000', paid_amount: '150000', expected: '300000', state: 'partial' }],
    });
  });

  it('pages 100 at a time and passes the filters through', async () => {
    const out = await service.listStudentPaymentSummary({ from: '2026-09-15', to: '2026-10-31', page: '2', status: 'unpaid', teacher_id: '7', class_id: '3', subject: ' English ', q: 'ali' }, 1);
    expect(repository.findStudentPaymentSummary).toHaveBeenCalledWith({
      centerId: 1, from: '2026-09-15', to: '2026-10-31', months: 2, status: 'unpaid', teacherId: 7, classId: 3, subject: 'English', q: 'ali', limit: 100, offset: 100,
    });
    expect(out).toMatchObject({ period: { from: '2026-09-15', to: '2026-10-31', months: 2 }, page: 2, limit: 100, total: 2 });
    expect(out.totals).toEqual({ students: 3, paid_students: 1, partial_students: 1, unpaid_students: 1, collected: 600000, remaining: 300000 });
    expect(out.rows[0]).toMatchObject({ paid_amount: 150000, expected: 300000, remaining: 150000 });
  });

  it('defaults to this month, ignores an unknown status and swaps a reversed range', async () => {
    await service.listStudentPaymentSummary({ status: 'everything' }, 1);
    const call = repository.findStudentPaymentSummary.mock.calls[0][0];
    expect(call.from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(call.months).toBe(1);
    expect(call.status).toBeUndefined();

    await service.listStudentPaymentSummary({ from: '2026-10-31', to: '2026-10-01' }, 1);
    expect(repository.findStudentPaymentSummary.mock.calls[1][0]).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });
  });
});
