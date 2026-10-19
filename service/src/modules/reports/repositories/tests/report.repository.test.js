const mockDb = { select: jest.fn() };

jest.mock('../../../../db/pool', () => ({ db: mockDb }));

const { PgDialect } = require('drizzle-orm/pg-core');
const reportRepository = require('../report.repository');

const dialect = new PgDialect();

const queueSelect = (rows = []) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.groupBy = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(rows));
  chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
  mockDb.select.mockReturnValueOnce(chain);
  return chain;
};

const whereSql = (chain) => dialect.sqlToQuery(chain.where.mock.calls[0][0]).sql;

describe('report repository: transfers are not joins or leaves', () => {
  beforeEach(() => mockDb.select.mockReset());

  test('new students leave out records made by a transfer', async () => {
    const chain = queueSelect([{ total: 3 }]);
    await reportRepository.countIntakeStudents({ start: '2026-10-01', end: '2026-10-31' });
    expect(whereSql(chain)).toContain('"transferred_from_student_id" is null');
  });

  test('students who left leave out transferred records', async () => {
    const chain = queueSelect([{ total: 3 }]);
    await reportRepository.countDeletedStudents({ start: '2026-10-01', end: '2026-10-31' });
    const sql = whereSql(chain);
    expect(sql).toContain('"deleted_at" is not null');
    expect(sql).toContain('"status" <> $');
  });
});
