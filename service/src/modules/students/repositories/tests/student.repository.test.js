jest.mock('../../../../db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

const pool = require('../../../../db/pool');
const studentRepository = require('../student.repository');

describe('students repository', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('builds scoped paginated student queries with search and teacher filters', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })
      .mockResolvedValueOnce({ rows: [{ student_id: 10 }, { student_id: 9 }] });

    const result = await studentRepository.findPaginatedWithClass(
      { q: 'Ali', teacher_id: 11, page: 2, limit: 25 },
      4
    );

    expect(pool.query.mock.calls[0][0]).toContain('(s.teacher_id = $2 OR c.teacher_id = $2)');
    expect(pool.query).toHaveBeenNthCalledWith(1, expect.stringContaining('COUNT(DISTINCT s.student_id)'), [4, 11, '%Ali%']);
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('ORDER BY s.student_id DESC'),
      [4, 11, '%Ali%', 25, 25]
    );
    expect(result).toEqual({ data: [{ student_id: 10 }, { student_id: 9 }], total: 2, page: 2, limit: 25 });
  });

  it('matches teacher filters against direct student and class teacher ownership', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [{ student_id: 12, class_id: 3 }] });

    await studentRepository.findPaginatedWithClass({ teacher_id: 7, page: 1, limit: 20 });

    expect(pool.query.mock.calls[0][0]).toContain('(s.teacher_id = $1 OR c.teacher_id = $1)');
    expect(pool.query.mock.calls[1][0]).toContain('c.teacher_id AS class_teacher_id');
    expect(pool.query.mock.calls[1][0]).toContain('COALESCE(s.teacher_id, c.teacher_id) AS effective_teacher_id');
    expect(pool.query.mock.calls[0][1]).toEqual([7]);
    expect(pool.query.mock.calls[1][1]).toEqual([7, 20, 0]);
  });

  it('uses null-class filter without adding a class id param', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await studentRepository.findPaginatedWithClass({ class_id: -1, page: 1, limit: 10 });

    expect(pool.query.mock.calls[0][0]).toContain('s.class_id IS NULL');
    expect(pool.query.mock.calls[0][1]).toEqual([]);
    expect(pool.query.mock.calls[1][1]).toEqual([10, 0]);
  });

  it('looks students up by username excluding deleted rows', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ student_id: 1, username: 'ali' }] });

    const result = await studentRepository.findByUsername('ali');

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE username = $1 AND deleted_at IS NULL'),
      ['ali']
    );
    expect(result).toEqual({ student_id: 1, username: 'ali' });
  });
});
