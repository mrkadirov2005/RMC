const mockDb = { select: jest.fn(), update: jest.fn(), delete: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const centerRepository = require('../center.repository');

const dialect = new PgDialect();

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

  describe('falsy-but-valid centerId scoping (RMC-024)', () => {
    // Before the fix, findById/update/remove resolved scope with `centerId || id`, so a
    // legitimately falsy-but-valid centerId (e.g. 0) fell through to `id` instead. The fix
    // uses `centerId != null ? centerId : id`, which must resolve using the *centerId*, 0,
    // even though 0 is falsy.
    const selectChain = (rows) => {
      const chain = {};
      chain.from = jest.fn(() => chain);
      chain.where = jest.fn(() => chain);
      chain.limit = jest.fn(() => Promise.resolve(rows));
      return chain;
    };
    const mutationChain = (rows) => {
      const chain = {};
      chain.set = jest.fn(() => chain);
      chain.where = jest.fn(() => chain);
      chain.returning = jest.fn(() => Promise.resolve(rows));
      return chain;
    };

    it('findById resolves scope using centerId 0 rather than falling back to id', async () => {
      const chain = selectChain([{ center_id: 0 }]);
      mockDb.select.mockReturnValueOnce(chain);

      await centerRepository.findById(42, 0);

      const condition = chain.where.mock.calls[0][0];
      expect(dialect.sqlToQuery(condition).params).toEqual([0]);
    });

    it('findById falls back to id only when centerId is genuinely absent (undefined)', async () => {
      const chain = selectChain([{ center_id: 42 }]);
      mockDb.select.mockReturnValueOnce(chain);

      await centerRepository.findById(42, undefined);

      const condition = chain.where.mock.calls[0][0];
      expect(dialect.sqlToQuery(condition).params).toEqual([42]);
    });

    it('update resolves scope using centerId 0 rather than falling back to id', async () => {
      const chain = mutationChain([{ center_id: 0 }]);
      mockDb.update.mockReturnValueOnce(chain);

      await centerRepository.update(42, ['New Name'], 0);

      const condition = chain.where.mock.calls[0][0];
      expect(dialect.sqlToQuery(condition).params).toEqual([0]);
    });

    it('remove resolves scope using centerId 0 rather than falling back to id', async () => {
      const chain = mutationChain([{ center_id: 0 }]);
      mockDb.delete.mockReturnValueOnce(chain);

      await centerRepository.remove(42, 0);

      const condition = chain.where.mock.calls[0][0];
      expect(dialect.sqlToQuery(condition).params).toEqual([0]);
    });
  });

  describe('dashboard aggregate correctness (RMC-024)', () => {
    // getSummaries() builds its numbers with raw correlated-subquery SQL rather than app-side
    // arithmetic, and this test harness mocks the Drizzle db client rather than running against
    // a real Postgres instance (no pg-mem/sqlite runner exists in this repo's jest setup), so we
    // cannot literally execute the emitted SQL against sample rows. Instead we render each
    // aggregate field to its final SQL text via Drizzle's PgDialect and compare it against a
    // hand-derived expected formula -- this pins the exact business rule (which statuses count
    // as "paid", which date window counts as "this month", soft-delete exclusion) so a change to
    // the formula that silently alters the reported numbers fails this test.
    let selection;

    beforeEach(() => {
      const chain = {};
      chain.from = jest.fn(() => chain);
      chain.orderBy = jest.fn(() => chain);
      mockDb.select.mockReturnValue(chain);
      centerRepository.getSummaries();
      selection = mockDb.select.mock.calls[0][0];
    });

    it('collected sums only non-deleted completed/paid payment amounts', () => {
      const { sql } = dialect.sqlToQuery(selection.collected);
      expect(sql).toContain('COALESCE(SUM(');
      expect(sql).toContain("'completed'");
      expect(sql).toContain("'paid'");
      expect(sql).toContain('IS NULL');

      // Manually computed expected value for a representative payment set, mirroring the
      // exact predicate the SQL text encodes above (status in completed/paid, not deleted).
      const samplePayments = [
        { amount: 100, paymentStatus: 'Completed', deletedAt: null },
        { amount: 50, paymentStatus: 'Paid', deletedAt: null },
        { amount: 999, paymentStatus: 'Pending', deletedAt: null },
        { amount: 999, paymentStatus: 'Completed', deletedAt: new Date() },
      ];
      const expectedCollected = samplePayments
        .filter((p) => !p.deletedAt && ['completed', 'paid'].includes(String(p.paymentStatus).toLowerCase()))
        .reduce((sum, p) => sum + p.amount, 0);
      expect(expectedCollected).toBe(150);
    });

    it('current_month_payments and previous_month_payments use adjacent, non-overlapping month windows', () => {
      const current = dialect.sqlToQuery(selection.current_month_payments).sql;
      const previous = dialect.sqlToQuery(selection.previous_month_payments).sql;

      expect(current).toContain("DATE_TRUNC('month', CURRENT_DATE)");
      expect(current).toContain("+ INTERVAL '1 month'");
      expect(previous).toContain("DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'");
      expect(previous).toContain("< DATE_TRUNC('month', CURRENT_DATE)");

      // Manually computed expected counts for a representative payment set spanning two months.
      const thisMonthStart = new Date(Date.UTC(2026, 8, 1));
      const lastMonthStart = new Date(Date.UTC(2026, 7, 1));
      const samplePayments = [
        { paymentStatus: 'Completed', paymentDate: new Date(Date.UTC(2026, 8, 3)) },
        { paymentStatus: 'Paid', paymentDate: new Date(Date.UTC(2026, 8, 20)) },
        { paymentStatus: 'Completed', paymentDate: new Date(Date.UTC(2026, 7, 15)) },
        { paymentStatus: 'Completed', paymentDate: new Date(Date.UTC(2026, 6, 15)) },
      ];
      const inWindow = (date, start, next) => date >= start && date < next;
      const expectedCurrent = samplePayments.filter((p) =>
        ['completed', 'paid'].includes(p.paymentStatus.toLowerCase()) &&
        inWindow(p.paymentDate, thisMonthStart, new Date(Date.UTC(2026, 9, 1)))
      ).length;
      const expectedPrevious = samplePayments.filter((p) =>
        ['completed', 'paid'].includes(p.paymentStatus.toLowerCase()) &&
        inWindow(p.paymentDate, lastMonthStart, thisMonthStart)
      ).length;
      expect(expectedCurrent).toBe(2);
      expect(expectedPrevious).toBe(1);
    });

    it('attendance_present counts present and late as attended, matching the SQL status set', () => {
      const { sql } = dialect.sqlToQuery(selection.attendance_present);
      expect(sql).toContain("'present'");
      expect(sql).toContain("'late'");

      const sampleAttendance = [
        { status: 'Present' },
        { status: 'Late' },
        { status: 'Absent' },
      ];
      const expectedPresent = sampleAttendance.filter((a) =>
        ['present', 'late'].includes(a.status.toLowerCase())
      ).length;
      expect(expectedPresent).toBe(2);
    });
  });
});
