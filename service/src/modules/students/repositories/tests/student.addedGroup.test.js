const mockDb = { transaction: jest.fn() };
jest.mock('../../../../db/pool', () => ({ db: mockDb, sql: require('drizzle-orm').sql }));

const repository = require('../student.repository');

const tx = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(rows));
  const deleteWhere = jest.fn(() => Promise.resolve());
  const execute = jest.fn(async () => ({ rows: [{ has_work: false }] }));
  return { select: jest.fn(() => chain), delete: jest.fn(() => ({ where: deleteWhere })), execute, deleteWhere };
};

describe('copying a discount to the new group', () => {
  const discount = { center_id: 2, discount_type: 'fixed', discount_kind: 'serial_discount', value: '100000', original_price: '400000', final_price: '300000', start_date: '2026-09-01', end_date: null };

  it('keeps the amount off and prices it on the new group fee, from the start date', () => {
    expect(repository.discountCopy(discount, 12, 500000, '2026-10-21')).toMatchObject({
      studentId: 12, discountType: 'fixed', value: '100000', originalPrice: '500000', finalPrice: '400000', startDate: '2026-10-21', active: true,
    });
  });

  it('a percent discount takes its share of the new fee; never below zero', () => {
    expect(repository.discountCopy({ ...discount, discount_type: 'percent', value: '50' }, 12, 300000, '2026-10-21').finalPrice).toBe('150000');
    expect(repository.discountCopy({ ...discount, value: '900000' }, 12, 300000, '2026-10-21').finalPrice).toBe('0');
  });

  it('a discount that starts later keeps its own start', () => {
    expect(repository.discountCopy({ ...discount, start_date: '2026-11-01' }, 12, 300000, '2026-10-21').startDate).toBe('2026-11-01');
  });
});

describe('undo adding to a group', () => {
  beforeEach(() => mockDb.transaction.mockReset());

  it('deletes the added record and its discounts', async () => {
    const t = tx([{ student_id: 12, main_student_id: 9 }]);
    mockDb.transaction.mockImplementation((fn) => fn(t));
    await expect(repository.removeAddedGroup(12, 2)).resolves.toEqual({ removed: 12, main_student_id: 9 });
    expect(t.delete).toHaveBeenCalledTimes(2);
  });

  it('only for an added group record that is still active', async () => {
    const t = tx([]);
    mockDb.transaction.mockImplementation((fn) => fn(t));
    await expect(repository.removeAddedGroup(9, 2)).resolves.toEqual({ error: 'not_found' });
    expect(t.delete).not.toHaveBeenCalled();
  });

  it('test or consolidation work in the group blocks it too (it would be deleted with the record)', async () => {
    const t = tx([{ student_id: 12, main_student_id: 9 }]);
    t.execute.mockResolvedValue({ rows: [{ has_work: true }] });
    mockDb.transaction.mockImplementation((fn) => fn(t));
    await expect(repository.removeAddedGroup(12, 2)).resolves.toEqual({ error: 'has_activity' });
    expect(t.delete).not.toHaveBeenCalled();
  });

  it('when lessons, payments or coins point at the record, nothing is deleted', async () => {
    mockDb.transaction.mockRejectedValue(Object.assign(new Error('violates foreign key constraint'), { code: '23503' }));
    await expect(repository.removeAddedGroup(12, 2)).resolves.toEqual({ error: 'has_activity' });
  });

  it('other database errors are not hidden', async () => {
    mockDb.transaction.mockRejectedValue(new Error('connection lost'));
    await expect(repository.removeAddedGroup(12, 2)).rejects.toThrow('connection lost');
  });
});
