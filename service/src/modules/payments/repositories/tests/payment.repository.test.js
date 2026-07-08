jest.mock('../../../../db/pool', () => ({
  query: jest.fn(),
}));

const pool = require('../../../../db/pool');
const paymentRepository = require('../payment.repository');

describe('payments repository', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('filters payment listing by teacher, center, student, limit, and offset', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ payment_id: 1 }] });

    const rows = await paymentRepository.findAll({ teacherId: 4, centerId: 2, studentId: 9, limit: 10, offset: 20 });

    expect(pool.query.mock.calls[0][0]).toContain('s.teacher_id = $1');
    expect(pool.query.mock.calls[0][0]).toContain('p.center_id = $2');
    expect(pool.query.mock.calls[0][0]).toContain('p.student_id = $3');
    expect(pool.query.mock.calls[0][0]).toContain('LIMIT $4');
    expect(pool.query.mock.calls[0][0]).toContain('OFFSET $5');
    expect(pool.query.mock.calls[0][1]).toEqual([4, 2, 9, 10, 20]);
    expect(rows).toEqual([{ payment_id: 1 }]);
  });

  it('updates payments with teacher scope', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ payment_id: 3 }] });

    await paymentRepository.update(3, [1000, 'Completed', 'ok'], 2, 4);

    expect(pool.query.mock.calls[0][0]).toContain('payment_id = $4');
    expect(pool.query.mock.calls[0][0]).toContain('center_id = $5');
    expect(pool.query.mock.calls[0][0]).toContain('teacher_id = $6');
    expect(pool.query.mock.calls[0][1]).toEqual([1000, 'Completed', 'ok', 3, 2, 4]);
  });

  it('orders student payments by newest payment date', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await paymentRepository.findByStudent(5, 2);

    expect(pool.query.mock.calls[0][0]).toContain('ORDER BY payment_date DESC');
    expect(pool.query.mock.calls[0][1]).toEqual([5, 2]);
  });
});
