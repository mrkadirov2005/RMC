const chain = {};
chain.select = jest.fn(() => chain);
chain.from = jest.fn(() => chain);
chain.where = jest.fn(() => chain);
chain.limit = jest.fn(() => chain);
chain.then = (resolve) => Promise.resolve([]).then(resolve);

jest.mock('../../../../db/pool', () => ({ db: chain, sql: require('drizzle-orm').sql }));

const { PgDialect } = require('drizzle-orm/pg-core');
const roomsRepository = require('../rooms.repository');

const dialect = new PgDialect();

describe('room busy check', () => {
  test('only a group that still runs keeps the room: deleted or ended groups do not', async () => {
    await roomsRepository.findConflict(1, '9', 'Monday', '08:30', '10:00');
    const rendered = dialect.sqlToQuery(chain.where.mock.calls[0][0]).sql;
    expect(rendered).toContain('"rooms"."class_id" IS NULL OR EXISTS');
    expect(rendered).toContain('busy_class.deleted_at IS NULL');
    expect(rendered).toContain('busy_class.end_date IS NULL OR busy_class.end_date::date >= CURRENT_DATE');
  });
});
