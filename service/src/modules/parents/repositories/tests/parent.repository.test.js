const mockDb = {
  select: jest.fn(),
  selectDistinct: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const parentRepository = require('../parent.repository');

const createSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.innerJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.then = jest.fn((resolve, reject) => Promise.resolve(rows).then(resolve, reject));
  return chain;
};

const createMutationChain = (rows) => {
  const chain = {};
  chain.values = jest.fn(() => chain);
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  chain.then = jest.fn((resolve, reject) => Promise.resolve(rows).then(resolve, reject));
  return chain;
};

describe('parents repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists all parents scoped to a center via the student join', async () => {
    const chain = createSelectChain([{ parent_id: 1 }]);
    mockDb.selectDistinct.mockReturnValueOnce(chain);

    const rows = await parentRepository.findAllSafe(2);

    expect(mockDb.selectDistinct).toHaveBeenCalled();
    expect(chain.innerJoin).toHaveBeenCalledTimes(2);
    expect(chain.where).toHaveBeenCalled();
    expect(rows).toEqual([{ parent_id: 1 }]);
  });

  it('lists all parents unscoped when no center is provided', async () => {
    const chain = createSelectChain([{ parent_id: 1 }, { parent_id: 2 }]);
    mockDb.selectDistinct.mockReturnValueOnce(chain);

    const rows = await parentRepository.findAllSafe();

    expect(chain.innerJoin).not.toHaveBeenCalled();
    expect(chain.where).not.toHaveBeenCalled();
    expect(rows).toEqual([{ parent_id: 1 }, { parent_id: 2 }]);
  });

  it('finds a single parent by id scoped to a center', async () => {
    const chain = createSelectChain([{ parent_id: 5 }]);
    mockDb.selectDistinct.mockReturnValueOnce(chain);

    const row = await parentRepository.findByIdSafe(5, 2);

    expect(chain.innerJoin).toHaveBeenCalledTimes(2);
    expect(chain.where).toHaveBeenCalled();
    expect(row).toEqual({ parent_id: 5 });
  });

  it('returns null when a scoped lookup finds nothing', async () => {
    const chain = createSelectChain([]);
    mockDb.selectDistinct.mockReturnValueOnce(chain);

    const row = await parentRepository.findByIdSafe(999, 2);

    expect(row).toBeNull();
  });

  it('inserts a parent and populates center_id from the insert params (RMC-022 fix)', async () => {
    const chain = createMutationChain([{ parent_id: 10, center_id: 3 }]);
    mockDb.insert.mockReturnValueOnce(chain);

    const row = await parentRepository.insert(['Ali', 'Vali', 'a@x.com', '998900000000', 'aliv', 'hash:pw', 'Active', 3]);

    expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({ centerId: 3 }));
    expect(row).toEqual({ parent_id: 10, center_id: 3 });
  });

  it('inserts a parent with a null center_id when none is supplied', async () => {
    const chain = createMutationChain([{ parent_id: 11, center_id: null }]);
    mockDb.insert.mockReturnValueOnce(chain);

    await parentRepository.insert(['Ali', 'Vali', null, null, 'aliv2', 'hash:pw', 'Active', null]);

    expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({ centerId: null }));
  });

  it('updates a parent after a scoped existence check passes', async () => {
    const lookup = createSelectChain([{ parent_id: 5 }]);
    const update = createMutationChain([{ parent_id: 5, first_name: 'New' }]);
    mockDb.selectDistinct.mockReturnValueOnce(lookup);
    mockDb.update.mockReturnValueOnce(update);

    const row = await parentRepository.update(5, ['New', undefined, undefined, undefined, undefined], 2);

    expect(update.set).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'New' }));
    expect(row).toEqual({ parent_id: 5, first_name: 'New' });
  });

  it('refuses to update a parent outside the caller center scope', async () => {
    const lookup = createSelectChain([]);
    mockDb.selectDistinct.mockReturnValueOnce(lookup);

    const row = await parentRepository.update(5, ['New'], 2);

    expect(mockDb.update).not.toHaveBeenCalled();
    expect(row).toBeNull();
  });

  it('removes a parent after a scoped existence check passes', async () => {
    const lookup = createSelectChain([{ parent_id: 5 }]);
    const del = createMutationChain([{ parent_id: 5 }]);
    mockDb.selectDistinct.mockReturnValueOnce(lookup);
    mockDb.delete.mockReturnValueOnce(del);

    const row = await parentRepository.remove(5, 2);

    expect(mockDb.delete).toHaveBeenCalled();
    expect(row).toEqual({ parent_id: 5 });
  });

  it('refuses to remove a parent outside the caller center scope', async () => {
    const lookup = createSelectChain([]);
    mockDb.selectDistinct.mockReturnValueOnce(lookup);

    const row = await parentRepository.remove(5, 2);

    expect(mockDb.delete).not.toHaveBeenCalled();
    expect(row).toBeNull();
  });
});
