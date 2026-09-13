const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  transaction: jest.fn(),
  execute: jest.fn(),
};

jest.mock('../../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const { PgDialect } = require('drizzle-orm/pg-core');
const repository = require('../import_export.repository');

const dialect = new PgDialect();

const whereQuery = (chain, call = 0) => dialect.sqlToQuery(chain.where.mock.calls[call][0]);

const makeSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => Promise.resolve(rows));
  chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
  return chain;
};

const queueSelect = (rows = []) => {
  const chain = makeSelectChain(rows);
  mockDb.select.mockReturnValueOnce(chain);
  return chain;
};

const queueInsert = (rows = []) => {
  const chain = {};
  chain.values = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
  mockDb.insert.mockReturnValueOnce(chain);
  return chain;
};

const queueUpdate = () => {
  const chain = {};
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => Promise.resolve());
  mockDb.update.mockReturnValueOnce(chain);
  return chain;
};

describe('import and export repository', () => {
  beforeEach(() => {
    // mockClear leaves queued mockReturnValueOnce values in place, and these tests queue one
    // chain per expected query, so the queues have to be emptied between tests.
    Object.values(mockDb).forEach((fn) => fn.mockReset());
  });

  describe('export selections', () => {
    it('lists live students with their class and serial discount columns', () => {
      const chain = queueSelect([]);

      repository.selectAllStudents();

      const selection = mockDb.select.mock.calls[0][0];
      expect(selection).toHaveProperty('is_discounted');
      expect(selection).toHaveProperty('discount_value');
      expect(chain.leftJoin).toHaveBeenCalled();
      expect(whereQuery(chain).sql).toContain('is null');
    });

    it('scopes the student export to a center when one is given', () => {
      const chain = queueSelect([]);

      repository.selectAllStudents(4);

      expect(whereQuery(chain).params).toContain(4);
    });

    it.each([
      ['selectAllTeachers'],
      ['selectAllClasses'],
      ['selectAllPayments'],
      ['selectAllRooms'],
      ['selectAllAssignments'],
      ['selectAllSubjects'],
    ])('%s scopes its export to the given center', (method) => {
      const chain = queueSelect([]);

      repository[method](4);

      expect(whereQuery(chain).params).toContain(4);
      expect(chain.orderBy).toHaveBeenCalled();
    });

    it.each([
      ['selectAllTeachers'],
      ['selectAllClasses'],
      ['selectAllPayments'],
    ])('%s exports every center when none is given', (method) => {
      const chain = queueSelect([]);

      repository[method]();

      expect(whereQuery(chain).params).toEqual([]);
    });
  });

  describe('lookups used while importing', () => {
    it('finds a teacher by a trimmed employee id', async () => {
      const chain = queueSelect([{ teacher_id: 7 }]);

      await expect(repository.findTeacherIdByEmployeeId('  EMP-1  ', 4)).resolves.toBe(7);

      const query = whereQuery(chain);
      expect(query.sql.toLowerCase()).toContain('ilike');
      expect(query.params).toEqual(expect.arrayContaining(['EMP-1', 4]));
    });

    it('returns null for a blank employee id without querying', async () => {
      await expect(repository.findTeacherIdByEmployeeId('   ')).resolves.toBeNull();

      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('returns null when no teacher matches', async () => {
      queueSelect([]);

      await expect(repository.findTeacherIdByEmployeeId('EMP-9')).resolves.toBeNull();
    });

    it('matches a class on either its name or its code', async () => {
      const chain = queueSelect([{ class_id: 12 }]);

      await expect(repository.findClassIdByNameOrCode('Year  1', 'CLS-1', 4)).resolves.toBe(12);

      const query = whereQuery(chain);
      expect(query.params).toEqual(expect.arrayContaining(['Year 1', 'CLS-1', 4]));
    });

    it('returns null when neither a class name nor a code is supplied', async () => {
      await expect(repository.findClassIdByNameOrCode('  ', null)).resolves.toBeNull();

      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('finds a student by a trimmed enrollment number', async () => {
      const chain = queueSelect([{ student_id: 9 }]);

      await expect(repository.findStudentIdByEnrollmentNumber(' ENR-3 ', 4)).resolves.toBe(9);
      expect(whereQuery(chain).params).toEqual(expect.arrayContaining(['ENR-3', 4]));
    });

    it('returns null for a blank enrollment number', async () => {
      await expect(repository.findStudentIdByEnrollmentNumber(null)).resolves.toBeNull();

      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('finds a student by first and last name within a class', async () => {
      const chain = queueSelect([{ student_id: 9 }]);

      await expect(repository.findStudentIdByNameAndClass('Ada', 'Lovelace', 12, 4)).resolves.toBe(9);
      expect(whereQuery(chain).params).toEqual(expect.arrayContaining(['Ada', 'Lovelace', 12, 4]));
    });

    it('refuses a name match when either half is missing', async () => {
      await expect(repository.findStudentIdByNameAndClass('Ada', '  ')).resolves.toBeNull();

      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateClassIdByNameOrCode', () => {
    it('returns an existing class without creating one', async () => {
      queueSelect([{ class_id: 12 }]);

      await expect(repository.findOrCreateClassIdByNameOrCode('Year 1', 'CLS-1', 4)).resolves.toBe(12);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('refuses to create a class when no center is given', async () => {
      queueSelect([]);

      await expect(repository.findOrCreateClassIdByNameOrCode('Year 1', 'CLS-1')).resolves.toBeNull();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('returns null when there is no name or code to build a class from', async () => {
      queueSelect([]);

      await expect(repository.findOrCreateClassIdByNameOrCode('  ', '  ', 4)).resolves.toBeNull();
    });

    it('creates the class under a normalized code derived from the name', async () => {
      queueSelect([]);
      queueSelect([]);
      const insertChain = queueInsert([{ class_id: 21 }]);

      await expect(repository.findOrCreateClassIdByNameOrCode('Year 1', null, 4)).resolves.toBe(21);

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
        centerId: 4,
        className: 'Year 1',
        paymentFrequency: 'Monthly',
      }));
    });

    it('appends the center id when the base code is already taken', async () => {
      queueSelect([]);
      queueSelect([{ class_id: 5 }]);
      queueSelect([]);
      const insertChain = queueInsert([{ class_id: 22 }]);

      await expect(repository.findOrCreateClassIdByNameOrCode('Year 1', 'CLS-1', 4)).resolves.toBe(22);

      expect(insertChain.values.mock.calls[0][0].classCode).toBe('CLS-1-4');
    });

    it('falls back to the class name when the code is blank', async () => {
      queueSelect([]);
      queueSelect([]);
      const insertChain = queueInsert([{ class_id: 23 }]);

      await repository.findOrCreateClassIdByNameOrCode(null, 'Year 1', 4);

      expect(insertChain.values.mock.calls[0][0].className).toBe('Year 1');
    });
  });

  describe('insertStudent', () => {
    it('updates the matching student rather than creating a duplicate', async () => {
      queueSelect([{ student_id: 9 }]);
      const updateChain = queueUpdate();

      await repository.insertStudent([4, 'ENR-3', 'Ada', 'Lovelace']);

      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Ada' }));
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates the student when the enrollment number is new', async () => {
      queueSelect([]);
      const insertChain = queueInsert([]);

      await repository.insertStudent([4, 'ENR-9', 'Ada', 'Lovelace']);

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ centerId: 4, enrollmentNumber: 'ENR-9' }));
    });
  });

  describe('insertTeacher', () => {
    it('updates the matching teacher rather than creating a duplicate', async () => {
      queueSelect([{ teacher_id: 7 }]);
      const updateChain = queueUpdate();

      await repository.insertTeacher([4, 'EMP-1', 'Ada']);

      expect(updateChain.set).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates the teacher when the employee id is new', async () => {
      queueSelect([]);
      const insertChain = queueInsert([]);

      await repository.insertTeacher([4, 'EMP-9', 'Ada']);

      expect(insertChain.values).toHaveBeenCalled();
    });
  });

  describe('upsertClassByCode', () => {
    it('updates a class that already carries the code', async () => {
      queueSelect([{ class_id: 12 }]);
      const updateChain = queueUpdate();

      await repository.upsertClassByCode([4, 'Year 1', 'CLS-1']);

      expect(updateChain.set).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates the class when the code is new', async () => {
      queueSelect([]);
      const insertChain = queueInsert([]);

      await repository.upsertClassByCode([4, 'Year 2', 'CLS-2']);

      expect(insertChain.values).toHaveBeenCalled();
    });
  });

  describe('insertPayment', () => {
    it('inserts without a lookup when the row carries no receipt number', async () => {
      const insertChain = queueInsert([]);

      await repository.insertPayment([9, 4, 100, 'Cash', '2026-01-01', 'Completed', 'note', null]);

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalled();
    });

    it('updates the live payment that already has that receipt number', async () => {
      const lookup = queueSelect([{ payment_id: 3 }]);
      const updateChain = queueUpdate();

      await repository.insertPayment([9, 4, 100, 'Cash', '2026-01-01', 'Completed', 'note', 'RCPT-1']);

      expect(whereQuery(lookup).sql).toContain('is null');
      expect(updateChain.set).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates the payment when the receipt number is new', async () => {
      queueSelect([]);
      const insertChain = queueInsert([]);

      await repository.insertPayment([9, 4, 100, 'Cash', '2026-01-01', 'Completed', 'note', 'RCPT-2']);

      expect(insertChain.values).toHaveBeenCalled();
    });
  });

  describe('upsertSerialDiscount', () => {
    it('updates the student active serial discount when one exists', async () => {
      queueSelect([{ discount_id: 6 }]);
      const updateChain = queueUpdate();

      await repository.upsertSerialDiscount([9, 4, 'percent', 15, 300000, 255000, 'Sibling']);

      expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({
        discountType: 'percent',
        value: 15,
        active: true,
      }));
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates a serial discount starting today when the student has none', async () => {
      queueSelect([]);
      const insertChain = queueInsert([]);

      await repository.upsertSerialDiscount([9, 4, 'fixed', 50000, 300000, 250000, 'Scholarship']);

      const values = insertChain.values.mock.calls[0][0];
      expect(values.discountKind).toBe('serial_discount');
      expect(values.active).toBe(true);
      expect(values.startDate).toBeDefined();
    });
  });

  describe('insertRoom and insertAssignment', () => {
    it('maps the room parameters onto named columns', async () => {
      const insertChain = queueInsert([]);

      await repository.insertRoom([4, '101', 12, 'Monday', '09:00', '10:00']);

      expect(insertChain.values).toHaveBeenCalledWith({
        centerId: 4,
        roomNumber: '101',
        classId: 12,
        day: 'Monday',
        time: '09:00',
        endTime: '10:00',
      });
    });

    it('maps the assignment parameters onto named columns', async () => {
      const insertChain = queueInsert([]);

      await repository.insertAssignment([4, 12, 9, 7, 'Homework', 'Chapter 1', '2026-02-01', null, 'Pending', null]);

      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
        assignmentTitle: 'Homework',
        status: 'Pending',
      }));
    });
  });

  describe('insertSubject', () => {
    it('inserts without a lookup when the row carries no subject code', async () => {
      const insertChain = queueInsert([]);

      await repository.insertSubject([4, 12, 'Maths', null, 7, 100, 40]);

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(insertChain.values).toHaveBeenCalled();
    });

    it('updates the subject already carrying that code in the class', async () => {
      const lookup = queueSelect([{ subject_id: 5 }]);
      const updateChain = queueUpdate();

      await repository.insertSubject([4, 12, 'Maths', ' MTH ', 7, 100, 40]);

      expect(whereQuery(lookup).params).toEqual(expect.arrayContaining([4, 12, 'MTH']));
      expect(updateChain.set).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates the subject when the code is new to the class', async () => {
      queueSelect([]);
      const insertChain = queueInsert([]);

      await repository.insertSubject([4, 12, 'Maths', 'MTH', 7, 100, 40]);

      expect(insertChain.values).toHaveBeenCalled();
    });
  });

  describe('upsert helpers keyed by an explicit id', () => {
    it.each([
      ['upsertStudent', [4, 'ENR-1']],
      ['upsertTeacher', [4, 'EMP-1']],
      ['upsertPayment', [9, 4]],
    ])('%s falls back to the natural-key insert when the CSV has no id column', async (method, params) => {
      queueSelect([]);
      queueInsert([]);

      await repository[method](params, false);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('updates the existing row when the CSV names an id that is already present', async () => {
      queueSelect([{ id: 9 }]);
      const updateChain = queueUpdate();

      await repository.upsertStudent([9, 4, 'ENR-1', 'Ada'], true);

      expect(updateChain.set).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('inserts with the explicit id when the CSV names an id that is missing', async () => {
      queueSelect([]);
      const insertChain = queueInsert([]);

      await repository.upsertStudent([9, 4, 'ENR-1', 'Ada'], true);

      expect(insertChain.values.mock.calls[0][0].studentId).toBe(9);
    });

    it('inserts without an id when the CSV id column is blank', async () => {
      const insertChain = queueInsert([]);

      await repository.upsertStudent([null, 4, 'ENR-1', 'Ada'], true);

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(insertChain.values.mock.calls[0][0]).not.toHaveProperty('studentId');
    });

    it.each([
      ['upsertRoom', [3, 4, '101', 12, 'Monday', '09:00', '10:00'], 'roomNumber', '101'],
      ['upsertAssignment', [3, 4, 12, 9, 7, 'Homework'], 'assignmentTitle', 'Homework'],
      ['upsertSubject', [3, 4, 12, 'Maths', 'MTH'], 'subjectName', 'Maths'],
    ])('%s shifts the parameters past the id column', async (method, params, key, value) => {
      queueSelect([]);
      const insertChain = queueInsert([]);

      await repository[method](params, true);

      expect(insertChain.values.mock.calls[0][0][key]).toBe(value);
    });

    it.each([
      ['upsertRoom', [4, '101', 12, 'Monday', '09:00', '10:00']],
      ['upsertAssignment', [4, 12, 9, 7, 'Homework']],
    ])('%s uses the plain insert when the CSV has no id column', async (method, params) => {
      const insertChain = queueInsert([]);

      await repository[method](params, false);

      expect(insertChain.values).toHaveBeenCalled();
    });
  });

  describe('syncSerialSequence', () => {
    it('resets the sequence to the highest id currently in the table', async () => {
      mockDb.execute.mockResolvedValue(undefined);

      await repository.syncSerialSequence('students', 'student_id');

      const statement = dialect.sqlToQuery(mockDb.execute.mock.calls[0][0]).sql;
      expect(statement).toContain('setval');
      expect(statement).toContain("pg_get_serial_sequence('students', 'student_id')");
      expect(statement).toContain('MAX(student_id)');
    });
  });

  describe('withTransaction', () => {
    it('hands the callback straight to the driver transaction', async () => {
      const callback = jest.fn();
      mockDb.transaction.mockResolvedValue('done');

      await expect(repository.withTransaction(callback)).resolves.toBe('done');
      expect(mockDb.transaction).toHaveBeenCalledWith(callback);
    });
  });
});
