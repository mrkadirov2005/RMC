// RMC-041: telegram_registrations used to run a per-request
// `CREATE TABLE IF NOT EXISTS` DDL statement on every repository call. That
// was removed. Separately, convertToStudent() re-reads the registration
// inside its transaction and refuses to convert it a second time once it has
// a converted_student_id / status "Imported" — this test proves both:
// (1) a normal conversion inserts exactly one student row, (2) converting an
// already-converted registration again is rejected without inserting another
// student, and (3) no DDL-shaped SQL is ever sent to the pool during normal
// operation.
const mockTx = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};
const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
  transaction: jest.fn(async (handler) => handler(mockTx)),
};
const mockPool = {
  db: mockDb,
  query: jest.fn(),
  connect: jest.fn(),
};

jest.mock('../../../../db/pool', () => mockPool);

const repository = require('../telegram_registration.repository');

const makeSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(rows));
  chain.orderBy = jest.fn(() => Promise.resolve(rows));
  chain.then = jest.fn((resolve, reject) => Promise.resolve(rows).then(resolve, reject));
  return chain;
};

const makeInsertChain = (rows) => {
  const chain = {};
  chain.values = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

const makeUpdateChain = (rows) => {
  const chain = {};
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  return chain;
};

const unconvertedRegistration = {
  registration_id: 7,
  first_name: 'Ali',
  last_name: 'Vali',
  username: 'alivali',
  password_hash: 'hash',
  center_id: 2,
  status: 'Pending',
  converted_student_id: null,
};

describe('telegram registration repository (RMC-041)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.transaction.mockImplementation(async (handler) => handler(mockTx));
  });

  describe('single-conversion guarantee', () => {
    it('converts an unconverted registration into exactly one student record', async () => {
      mockTx.select.mockReturnValueOnce(makeSelectChain([unconvertedRegistration]));
      mockTx.insert.mockReturnValueOnce(makeInsertChain([{ student_id: 55, first_name: 'Ali' }]));
      mockTx.update.mockReturnValueOnce(makeUpdateChain([{ registration_id: 7, status: 'Imported', converted_student_id: 55 }]));

      const result = await repository.convertToStudent(7, 2);

      expect(mockTx.insert).toHaveBeenCalledTimes(1);
      expect(result.student).toEqual({ student_id: 55, first_name: 'Ali' });
      expect(result.registration).toMatchObject({ status: 'Imported', converted_student_id: 55 });
    });

    it('rejects converting the same registration a second time and does not insert another student', async () => {
      const alreadyConverted = { ...unconvertedRegistration, status: 'Imported', converted_student_id: 55 };
      mockTx.select.mockReturnValueOnce(makeSelectChain([alreadyConverted]));

      const result = await repository.convertToStudent(7, 2);

      expect(result).toEqual({ error: 'already_imported', registration: alreadyConverted });
      expect(mockTx.insert).not.toHaveBeenCalled();
      expect(mockTx.update).not.toHaveBeenCalled();
    });

    it('rejects conversion when the registration cannot be found', async () => {
      mockTx.select.mockReturnValueOnce(makeSelectChain([]));

      const result = await repository.convertToStudent(999, 2);

      expect(result).toEqual({ error: 'not_found' });
      expect(mockTx.insert).not.toHaveBeenCalled();
    });

    it('rejects conversion when the registration belongs to a different center', async () => {
      mockTx.select.mockReturnValueOnce(makeSelectChain([{ ...unconvertedRegistration, center_id: 9 }]));

      const result = await repository.convertToStudent(7, 2);

      expect(result).toEqual({ error: 'not_found' });
      expect(mockTx.insert).not.toHaveBeenCalled();
    });
  });

  describe('no per-request DDL (RMC-041 regression guard)', () => {
    it('never sends a raw query (DDL or otherwise) to the pool while listing registrations', async () => {
      mockDb.select.mockReturnValueOnce(makeSelectChain([]));

      await repository.list(2, 'pending');

      expect(mockPool.query).not.toHaveBeenCalled();
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('never sends a raw query to the pool while converting a registration', async () => {
      mockTx.select.mockReturnValueOnce(makeSelectChain([unconvertedRegistration]));
      mockTx.insert.mockReturnValueOnce(makeInsertChain([{ student_id: 55 }]));
      mockTx.update.mockReturnValueOnce(makeUpdateChain([{ registration_id: 7 }]));

      await repository.convertToStudent(7, 2);

      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('never sends a raw query to the pool while rejecting a registration', async () => {
      mockDb.update.mockReturnValueOnce(makeUpdateChain([{ registration_id: 7, status: 'Rejected' }]));

      await repository.remove(7, 2);

      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });
});
