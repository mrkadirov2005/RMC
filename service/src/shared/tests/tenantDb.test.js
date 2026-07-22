jest.mock('../../db/pool', () => ({
  query: jest.fn(),
}));

const pool = require('../../db/pool');
const { studentBelongsToTeacher } = require('../tenantDb');

describe('tenant db ownership helpers', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('checks student teacher ownership using class teacher first, then direct student teacher', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ student_id: 12 }] });

    await expect(studentBelongsToTeacher(12, 7)).resolves.toBe(true);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('COALESCE(c.teacher_id, s.teacher_id) = $2'),
      [12, 7]
    );
    expect(pool.query.mock.calls[0][0]).toContain('LEFT JOIN classes c ON c.class_id = s.class_id');
  });

  it('returns false when no effective teacher match exists', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(studentBelongsToTeacher(12, 7)).resolves.toBe(false);
  });
});
