const mockDb = { select: jest.fn(), update: jest.fn(), delete: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
}));

const archiveRepository = require('../archive.repository');

const createMutationChain = (rows) => {
  const chain = {};
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

// The restore/purge paths are the least-exercised code in the app: each entity in the
// allowlist (students/teachers/classes/payments/sessions) is restored via the same generic
// restoreArchived()/purgeArchived() functions keyed off a shared entityMap, so a round-trip
// test per entity both proves the allowlist wiring is correct and pins the students/teachers
// special case (status reset to 'Active') against classes/payments/sessions (no status field).
describe('archive repository restore/purge round trip per entity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    ['students', true],
    ['teachers', true],
    ['classes', false],
    ['payments', false],
    ['sessions', false],
  ])('%s', (entity, expectsStatusReset) => {
    it(`restores a soft-deleted ${entity} row, clearing deleted_at${expectsStatusReset ? ' and resetting status to Active' : ''}`, async () => {
      const chain = createMutationChain([{ id: 1, deleted_at: null, ...(expectsStatusReset ? { status: 'Active' } : {}) }]);
      mockDb.update.mockReturnValueOnce(chain);

      const result = await archiveRepository.restoreArchived(entity, 1, 2);

      expect(mockDb.update).toHaveBeenCalled();
      const setValues = chain.set.mock.calls[0][0];
      expect(setValues.deletedAt).toBeNull();
      if (expectsStatusReset) {
        expect(setValues.status).toBe('Active');
      } else {
        expect(setValues.status).toBeUndefined();
      }
      expect(result).toEqual({ row: { id: 1, deleted_at: null, ...(expectsStatusReset ? { status: 'Active' } : {}) } });
    });

    it(`restore is a no-op when the ${entity} row is not actually archived (already restored, or wrong center)`, async () => {
      const chain = createMutationChain([]);
      mockDb.update.mockReturnValueOnce(chain);

      const result = await archiveRepository.restoreArchived(entity, 1, 2);

      expect(result).toEqual({ row: null });
    });

    it(`purges a soft-deleted ${entity} row permanently`, async () => {
      const chain = createMutationChain([{ id: 1 }]);
      mockDb.delete.mockReturnValueOnce(chain);

      const result = await archiveRepository.purgeArchived(entity, 1, 2);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(result).toEqual({ row: { id: 1 } });
    });
  });

  it('rejects an entity outside the allowlist for both restore and purge without touching the db', async () => {
    await expect(archiveRepository.restoreArchived('not_a_real_entity', 1, 2)).resolves.toEqual({ error: 'invalid_entity' });
    await expect(archiveRepository.purgeArchived('not_a_real_entity', 1, 2)).resolves.toEqual({ error: 'invalid_entity' });
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.delete).not.toHaveBeenCalled();
  });
});
