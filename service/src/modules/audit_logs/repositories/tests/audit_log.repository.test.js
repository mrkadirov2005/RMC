const mockDb = { select: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const auditLogRepository = require('../audit_log.repository');

// Renders a Drizzle SQL condition (including nested and()/eq()/sql`` wrappers) into a
// readable string without ever calling JSON.stringify on it -- pg-core Column objects hold a
// circular `table` back-reference, so JSON.stringify throws (this is exactly why the
// pre-existing centers.repository.test.js's queryChunks assertion is broken/skipped by this
// project). Instead this walks queryChunks and only pulls out safe, non-circular fields:
// a StringChunk's raw text, and a Column's `table name`.`column name`.
const renderCondition = (node) => {
  if (node == null) return '';
  if (node.constructor && node.constructor.name === 'SQL' && Array.isArray(node.queryChunks)) {
    return node.queryChunks.map(renderCondition).join('');
  }
  if (typeof node === 'object' && Array.isArray(node.value)) {
    return node.value.join('');
  }
  if (node && node.name && node.table) {
    const tableName = node.table[Symbol.for('drizzle:Name')];
    return `${tableName}.${node.name}`;
  }
  return String(node);
};

describe('audit log repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters by center_id using a column-based comparison with a JSONB fallback for legacy rows (RMC-047)', () => {
    const chain = {};
    chain.from = jest.fn(() => chain);
    chain.orderBy = jest.fn(() => chain);
    chain.where = jest.fn(() => chain);
    mockDb.select.mockReturnValue(chain);

    auditLogRepository.findFiltered({ centerId: 5 });

    expect(chain.where).toHaveBeenCalledTimes(1);
    const condition = chain.where.mock.calls[0][0];
    const rendered = renderCondition(condition);

    // Primary branch: compares the populated audit_logs.center_id column directly (no JSONB scan
    // needed for new rows written after RMC-047 started populating it).
    expect(rendered).toContain('COALESCE(audit_logs.center_id');
    // Fallback branch: still extracts the legacy details->>'center_id' text for older rows where
    // the column is NULL, so historical audit rows remain queryable.
    expect(rendered).toContain("audit_logs.details->>'center_id')::int");
    // The filter value itself is the right-hand side of the comparison.
    expect(rendered).toContain('= 5');
  });

  it('omits the center filter entirely (and does not touch details) when no centerId is supplied', () => {
    const chain = {};
    chain.from = jest.fn(() => chain);
    chain.orderBy = jest.fn(() => chain);
    chain.where = jest.fn(() => chain);
    mockDb.select.mockReturnValue(chain);

    auditLogRepository.findFiltered({ entityType: 'student' });

    const condition = chain.where.mock.calls[0][0];
    const rendered = renderCondition(condition);
    expect(rendered).not.toContain('COALESCE');
    expect(rendered).toContain('audit_logs.entity_type');
  });

  it('applies limit and offset when provided', () => {
    const chain = {};
    chain.from = jest.fn(() => chain);
    chain.orderBy = jest.fn(() => chain);
    chain.limit = jest.fn(() => chain);
    chain.offset = jest.fn(() => chain);
    mockDb.select.mockReturnValue(chain);

    auditLogRepository.findFiltered({}, 20, 40);

    expect(chain.limit).toHaveBeenCalledWith(20);
    expect(chain.offset).toHaveBeenCalledWith(40);
  });
});
