const mockDb = { select: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const centerRepository = require('../center.repository');

describe('centers repository summaries', () => {
  it('casts attendance enum values to text before using an empty-string fallback', () => {
    const chain = {};
    chain.from = jest.fn(() => chain);
    chain.orderBy = jest.fn(() => chain);
    mockDb.select.mockReturnValue(chain);

    centerRepository.getSummaries();

    const selection = mockDb.select.mock.calls[0][0];
    const chunks = JSON.stringify(selection.attendance_present.queryChunks);
    expect(chunks).toContain('::text');
    expect(chunks).toContain("COALESCE(");
  });
});
