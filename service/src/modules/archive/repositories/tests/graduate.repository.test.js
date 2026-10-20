const mockPool = { query: jest.fn(async () => ({ rows: [] })) };
jest.mock('../../../../db/pool', () => mockPool);

const graduateRepository = require('../graduate.repository');

describe('graduates list', () => {
  beforeEach(() => mockPool.query.mockClear());

  it('takes students archived as "finished successfully" and as the older "Graduated"', async () => {
    expect(graduateRepository.GRADUATE_REASON_CODES).toEqual(['finished_successfully', 'graduated']);
    await graduateRepository.findGraduates(2);
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toContain('r.reason_code = ANY($2::text[])');
    expect(params).toEqual([2, ['finished_successfully', 'graduated']]);
  });

  it('lets certificates be added for either kind of graduate', async () => {
    await graduateRepository.findGraduateCenter(671, 2);
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toContain('r.reason_code = ANY($3::text[])');
    expect(params).toEqual([671, 2, ['finished_successfully', 'graduated']]);
  });
});
