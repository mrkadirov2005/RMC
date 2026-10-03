const mockDb = { select: jest.fn(), insert: jest.fn(), update: jest.fn(), delete: jest.fn(), transaction: jest.fn() };

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const studentRepository = require('../student.repository');

// The transfer runs entirely inside one transaction, so the double queues one chain per query
// in the order the repository issues them.
const createTx = () => {
  const selectQueue = [];
  const insertQueue = [];
  const updateQueue = [];
  const calls = { selects: [], inserts: [], updates: [] };

  const tx = {
    queueSelect: (rows) => selectQueue.push(rows),
    queueInsert: (rows) => insertQueue.push(rows),
    queueUpdate: (rows) => updateQueue.push(rows),
    calls,
    select: jest.fn((selection) => {
      const rows = selectQueue.shift() || [];
      calls.selects.push(selection);
      const chain = {};
      chain.from = jest.fn(() => chain);
      chain.leftJoin = jest.fn(() => chain);
      chain.where = jest.fn(() => chain);
      chain.limit = jest.fn(() => Promise.resolve(rows));
      chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
      return chain;
    }),
    insert: jest.fn(() => {
      const rows = insertQueue.shift() || [];
      const chain = {};
      chain.values = jest.fn((values) => {
        calls.inserts.push(values);
        return chain;
      });
      chain.returning = jest.fn(() => Promise.resolve(rows));
      chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
      return chain;
    }),
    update: jest.fn(() => {
      const rows = updateQueue.shift() || [];
      const chain = {};
      chain.set = jest.fn((values) => {
        calls.updates.push(values);
        return chain;
      });
      chain.where = jest.fn(() => chain);
      chain.returning = jest.fn(() => Promise.resolve(rows));
      return chain;
    }),
  };
  return tx;
};

const runTransfer = (tx, args = [1, 20, 5, 3]) => {
  mockDb.transaction.mockImplementation(async (callback) => callback(tx));
  return studentRepository.transferToClass(...args);
};

const sourceStudent = (overrides = {}) => ({
  student_id: 1,
  center_id: 3,
  class_id: 10,
  enrollment_number: 'ENR-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  username: 'ada',
  source_password_hash: 'hash',
  email: 'ada@example.com',
  phone: '+1',
  coins: 25,
  is_frozen: true,
  source_payment_amount: 300000,
  ...overrides,
});

const targetClass = (overrides = {}) => ({
  class_id: 20,
  center_id: 3,
  teacher_id: 7,
  payment_amount: 600000,
  ...overrides,
});

// A 30-day month with the transfer on the 11th: 10 days stay with the source group, 20 move.
const TRANSFER_DATE = new Date(Date.UTC(2026, 8, 11));

describe('students repository transfer', () => {
  beforeEach(() => {
    Object.values(mockDb).forEach((fn) => fn.mockReset());
    jest.useFakeTimers().setSystemTime(TRANSFER_DATE);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refuses a student who is out of scope or already transferred', async () => {
    const tx = createTx();
    tx.queueSelect([]);

    await expect(runTransfer(tx)).resolves.toEqual({ error: 'not_found' });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('refuses a target class that is not in the student center', async () => {
    const tx = createTx();
    tx.queueSelect([sourceStudent()]);
    tx.queueSelect([]);

    await expect(runTransfer(tx)).resolves.toEqual({ error: 'target_class_not_found' });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('refuses a transfer into the class the student is already in', async () => {
    const tx = createTx();
    tx.queueSelect([sourceStudent({ class_id: 20 })]);
    tx.queueSelect([targetClass()]);

    await expect(runTransfer(tx)).resolves.toEqual({ error: 'same_class' });
    expect(tx.update).not.toHaveBeenCalled();
  });

  const happyPath = (tx, { paid = 300000, links = [] } = {}) => {
    tx.queueSelect([sourceStudent()]);
    tx.queueSelect([targetClass()]);
    tx.queueSelect([]);
    tx.queueUpdate([{ student_id: 1, status: 'Transferred' }]);
    tx.queueInsert([{ student_id: 2 }]);
    tx.queueSelect([{ paid_amount: paid }]);
    tx.queueSelect(links);
  };

  it('marks the old record transferred and clears its soft delete', async () => {
    const tx = createTx();
    happyPath(tx);

    await runTransfer(tx);

    expect(tx.calls.updates[0]).toMatchObject({ status: 'Transferred', deletedAt: null, transferReasonId: 5 });
  });

  it('ends the old record the day before the transfer and starts the new one on it', async () => {
    const tx = createTx();
    happyPath(tx);

    await runTransfer(tx);

    expect(tx.calls.updates[0].endDate).toBe('2026-09-10');
    expect(tx.calls.inserts[0]).toMatchObject({ startDate: '2026-09-11', transferredFromStudentId: 1 });
  });

  it('dates the transfer in Tashkent time, not server UTC', async () => {
    // 20:00 UTC on the 10th is already 01:00 on the 11th in Tashkent.
    jest.setSystemTime(new Date(Date.UTC(2026, 8, 10, 20, 0)));
    const tx = createTx();
    happyPath(tx);

    const result = await runTransfer(tx);

    expect(result.payment_allocation.transfer_date).toBe('2026-09-11');
    expect(tx.calls.updates[0].endDate).toBe('2026-09-10');
  });

  it('copies the profile onto the new record and remembers the previous class', async () => {
    const tx = createTx();
    happyPath(tx);

    await runTransfer(tx);

    expect(tx.calls.inserts[0]).toMatchObject({
      centerId: 3,
      enrollmentNumber: 'ENR-1',
      firstName: 'Ada',
      passwordHash: 'hash',
      status: 'Active',
      teacherId: 7,
      classId: 20,
      previousClassId: 10,
      isFrozen: true,
      coins: 25,
    });
  });

  it('carries a coin balance of zero when the source has none', async () => {
    const tx = createTx();
    tx.queueSelect([sourceStudent({ coins: null })]);
    tx.queueSelect([targetClass()]);
    tx.queueSelect([]);
    tx.queueUpdate([{}]);
    tx.queueInsert([{ student_id: 2 }]);
    tx.queueSelect([{ paid_amount: 0 }]);
    tx.queueSelect([]);

    await runTransfer(tx);

    expect(tx.calls.inserts[0].coins).toBe(0);
  });

  it('leaves the new record unfrozen when the source freeze flag is absent', async () => {
    const tx = createTx();
    tx.queueSelect([sourceStudent({ is_frozen: null })]);
    tx.queueSelect([targetClass()]);
    tx.queueSelect([]);
    tx.queueUpdate([{}]);
    tx.queueInsert([{ student_id: 2 }]);
    tx.queueSelect([{ paid_amount: 0 }]);
    tx.queueSelect([]);

    await runTransfer(tx);

    expect(tx.calls.inserts[0].isFrozen).toBe(false);
  });

  it('leaves the new record without a teacher when the target class has none', async () => {
    const tx = createTx();
    tx.queueSelect([sourceStudent()]);
    tx.queueSelect([targetClass({ teacher_id: null })]);
    tx.queueSelect([]);
    tx.queueUpdate([{}]);
    tx.queueInsert([{ student_id: 2 }]);
    tx.queueSelect([{ paid_amount: 0 }]);
    tx.queueSelect([]);

    await runTransfer(tx);

    expect(tx.calls.inserts[0].teacherId).toBeNull();
  });

  describe('fee allocation', () => {
    it('keeps the earned days in the old group and moves the rest of the payment', async () => {
      const tx = createTx();
      happyPath(tx, { paid: 300000 });

      const result = await runTransfer(tx);

      expect(result.payment_allocation).toMatchObject({
        applied: true,
        transfer_date: '2026-09-11',
        paid_amount: 300000,
        source_days: 10,
        target_days: 20,
        total_days: 30,
        source_earned_amount: 100000,
        moved_amount: 200000,
        target_charge_amount: 400000,
        target_balance: -200000,
      });
    });

    it('moves the same amount off the old record and onto the new one', async () => {
      const tx = createTx();
      happyPath(tx, { paid: 300000 });

      await runTransfer(tx);

      const [, credit, moved] = tx.calls.inserts;
      expect(credit).toMatchObject({
        studentId: 1,
        amount: -200000,
        paymentType: 'Transfer Adjustment',
        transactionReference: 'TRANSFER-1-2-SOURCE',
        coverageDays: 20,
        coverageTotalDays: 30,
      });
      expect(moved).toMatchObject({
        studentId: 2,
        amount: 200000,
        paymentType: 'Transfer Adjustment',
        transactionReference: 'TRANSFER-1-2-TARGET',
      });
    });

    it('leaves a balance in the new group when it is cheaper than the old one', async () => {
      const tx = createTx();
      tx.queueSelect([sourceStudent({ source_payment_amount: 600000 })]);
      tx.queueSelect([targetClass({ payment_amount: 450000 })]);
      tx.queueSelect([]);
      tx.queueUpdate([{}]);
      tx.queueInsert([{ student_id: 2 }]);
      tx.queueSelect([{ paid_amount: 600000 }]);
      tx.queueSelect([]);

      const result = await runTransfer(tx);

      expect(result.payment_allocation).toMatchObject({
        source_earned_amount: 200000,
        moved_amount: 400000,
        target_charge_amount: 300000,
        target_balance: 100000,
      });
    });

    it('moves whatever a partial payment holds beyond the earned days', async () => {
      const tx = createTx();
      happyPath(tx, { paid: 150000 });

      const result = await runTransfer(tx);

      expect(result.payment_allocation).toMatchObject({ applied: true, moved_amount: 50000, target_balance: -350000 });
      expect(tx.calls.inserts[1].amount).toBe(-50000);
      expect(tx.calls.inserts[2].amount).toBe(50000);
    });

    it('moves nothing when the payment only covers the days already taught', async () => {
      const tx = createTx();
      happyPath(tx, { paid: 100000 });

      const result = await runTransfer(tx);

      expect(result.payment_allocation).toMatchObject({ applied: false, moved_amount: 0, target_charge_amount: 400000 });
      expect(tx.calls.inserts).toHaveLength(1);
    });

    it('counts a second transfer in the same month from the day the record started', async () => {
      const tx = createTx();
      tx.queueSelect([sourceStudent({ start_date: '2026-09-05' })]);
      tx.queueSelect([targetClass()]);
      tx.queueSelect([]);
      tx.queueUpdate([{}]);
      tx.queueInsert([{ student_id: 2 }]);
      tx.queueSelect([{ paid_amount: 250000 }]);
      tx.queueSelect([]);

      const result = await runTransfer(tx);

      // Only Sept 5-10 belong to this record: 6 of 30 days of 300000.
      expect(result.payment_allocation).toMatchObject({ source_days: 6, source_earned_amount: 60000, moved_amount: 190000 });
    });

    it('skips the allocation when the source class is free', async () => {
      const tx = createTx();
      tx.queueSelect([sourceStudent({ source_payment_amount: 0 })]);
      tx.queueSelect([targetClass()]);
      tx.queueSelect([]);
      tx.queueUpdate([{}]);
      tx.queueInsert([{ student_id: 2 }]);
      tx.queueSelect([{ paid_amount: 0 }]);
      tx.queueSelect([]);

      const result = await runTransfer(tx);

      expect(result.payment_allocation.applied).toBe(false);
      expect(tx.calls.inserts).toHaveLength(1);
    });

    it('still moves the payment when the target class is free', async () => {
      const tx = createTx();
      tx.queueSelect([sourceStudent()]);
      tx.queueSelect([targetClass({ payment_amount: 0 })]);
      tx.queueSelect([]);
      tx.queueUpdate([{}]);
      tx.queueInsert([{ student_id: 2 }]);
      tx.queueSelect([{ paid_amount: 300000 }]);
      tx.queueSelect([]);

      const result = await runTransfer(tx);

      expect(result.payment_allocation).toMatchObject({ target_charge_amount: 0, moved_amount: 200000, target_balance: 200000 });
      expect(tx.calls.inserts).toHaveLength(3);
    });

    it('moves the whole payment when the transfer happens on the first of the month', async () => {
      jest.setSystemTime(new Date(Date.UTC(2026, 8, 1)));
      const tx = createTx();
      happyPath(tx, { paid: 300000 });

      const result = await runTransfer(tx);

      expect(result.payment_allocation).toMatchObject({ source_days: 0, target_days: 30, moved_amount: 300000 });
      expect(tx.calls.updates[0].endDate).toBe('2026-08-31');
    });

    it('reads a paid amount of zero when the aggregate query returns nothing', async () => {
      const tx = createTx();
      tx.queueSelect([sourceStudent()]);
      tx.queueSelect([targetClass()]);
      tx.queueSelect([]);
      tx.queueUpdate([{}]);
      tx.queueInsert([{ student_id: 2 }]);
      tx.queueSelect([]);
      tx.queueSelect([]);

      const result = await runTransfer(tx);

      expect(result.payment_allocation.paid_amount).toBe(0);
      expect(result.payment_allocation.applied).toBe(false);
    });

    it('rounds a fractional daily rate to whole cents', async () => {
      const tx = createTx();
      tx.queueSelect([sourceStudent({ source_payment_amount: 100 })]);
      tx.queueSelect([targetClass({ payment_amount: 100 })]);
      tx.queueSelect([]);
      tx.queueUpdate([{}]);
      tx.queueInsert([{ student_id: 2 }]);
      tx.queueSelect([{ paid_amount: 100 }]);
      tx.queueSelect([]);

      const result = await runTransfer(tx);

      expect(result.payment_allocation.source_earned_amount).toBe(33.33);
      expect(result.payment_allocation.moved_amount).toBe(66.67);
      expect(result.payment_allocation.target_charge_amount).toBe(66.67);
    });
  });

  describe('parent links', () => {
    it('copies each parent link onto the new record', async () => {
      const tx = createTx();
      happyPath(tx, { paid: 0, links: [{ parentId: 4, relationship: 'Mother', isPrimary: true }] });
      tx.queueSelect([]);

      await runTransfer(tx);

      expect(tx.calls.inserts[tx.calls.inserts.length - 1]).toEqual({
        parentId: 4,
        studentId: 2,
        relationship: 'Mother',
        isPrimary: true,
      });
    });

    it('does not duplicate a link the new record already has', async () => {
      const tx = createTx();
      happyPath(tx, { paid: 0, links: [{ parentId: 4, relationship: 'Mother', isPrimary: true }] });
      tx.queueSelect([{ parentId: 4 }]);

      await runTransfer(tx);

      expect(tx.calls.inserts).toHaveLength(1);
    });
  });

  it('refuses a group the student already attends through a linked record', async () => {
    const tx = createTx();
    tx.queueSelect([sourceStudent({ main_student_id: 7 })]);
    tx.queueSelect([targetClass()]);
    tx.queueSelect([{ student_id: 8 }]);

    await expect(runTransfer(tx)).resolves.toEqual({ error: 'already_in_group' });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('re-points the student\'s other group records when the main record moves', async () => {
    const tx = createTx();
    happyPath(tx);

    await runTransfer(tx);

    expect(tx.calls.inserts[0].mainStudentId).toBeNull();
    expect(tx.calls.updates[1]).toMatchObject({ mainStudentId: 2 });
  });

  it('keeps a group record pointing at the same main record when it moves', async () => {
    const tx = createTx();
    tx.queueSelect([sourceStudent({ main_student_id: 7, username: null, source_password_hash: null })]);
    tx.queueSelect([targetClass()]);
    tx.queueSelect([]);
    tx.queueUpdate([{}]);
    tx.queueInsert([{ student_id: 2 }]);
    tx.queueSelect([{ paid_amount: 0 }]);
    tx.queueSelect([]);

    await runTransfer(tx);

    expect(tx.calls.inserts[0]).toMatchObject({ mainStudentId: 7, username: null, passwordHash: null });
    expect(tx.calls.updates).toHaveLength(1);
  });

  it('returns both records alongside the allocation summary', async () => {
    const tx = createTx();
    happyPath(tx, { paid: 300000 });

    const result = await runTransfer(tx);

    expect(result.transferred).toEqual({ student_id: 1, status: 'Transferred' });
    expect(result.student).toEqual({ student_id: 2 });
  });
});
