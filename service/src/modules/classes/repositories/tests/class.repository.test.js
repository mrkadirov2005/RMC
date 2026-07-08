jest.mock('../../../../db/pool', () => ({
  query: jest.fn(),
}));

const pool = require('../../../../db/pool');
const classRepository = require('../class.repository');

describe('classes repository', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  it('adds center and teacher scope to findAll', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ class_id: 1 }] });

    const rows = await classRepository.findAll(2, 7);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('c.center_id = $1'), [2, 7]);
    expect(pool.query.mock.calls[0][0]).toContain('c.teacher_id = $2');
    expect(rows).toEqual([{ class_id: 1 }]);
  });

  it('checks teacher existence inside center scope', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ teacher_id: 4 }] });

    await expect(classRepository.teacherExists(4, 2)).resolves.toBe(true);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('teacher_id = $1'),
      [4, 2]
    );
    expect(pool.query.mock.calls[0][0]).toContain('center_id = $2');
  });

  it('soft deletes classes with center scope', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ class_id: 9 }] });

    await classRepository.remove(9, 3);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('deleted_at = CURRENT_TIMESTAMP'), [9, 3]);
    expect(pool.query.mock.calls[0][0]).toContain('center_id = $2');
  });
});
