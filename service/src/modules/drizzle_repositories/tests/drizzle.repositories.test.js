const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  transaction: jest.fn(),
  execute: jest.fn(() => {
    throw new Error('Repositories should use Drizzle query builder methods instead of db.execute');
  }),
};

jest.mock('../../../db/pool', () => ({
  db: mockDb,
  sql: require('drizzle-orm').sql,
}));

const settingsRepository = require('../../settings/repositories/settings.repository');
const translationRepository = require('../../translations/repositories/translation.repository');
const savedFilterRepository = require('../../saved_filters/repositories/saved_filter.repository');
const notificationRepository = require('../../notifications/repositories/notification.repository');
const teacherPaymentRepository = require('../../teachers/repositories/teacher_payment.repository');
const roomsRepository = require('../../rooms/repositories/rooms.repository');

const createSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.orderBy = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.leftJoin = jest.fn(() => chain);
  chain.innerJoin = jest.fn(() => chain);
  chain.then = jest.fn((resolve, reject) => Promise.resolve(rows).then(resolve, reject));
  return chain;
};

const createMutationChain = (rows) => {
  const chain = {};
  chain.values = jest.fn(() => chain);
  chain.set = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.onConflictDoUpdate = jest.fn(() => chain);
  chain.returning = jest.fn(() => Promise.resolve(rows));
  chain.then = jest.fn((resolve, reject) => Promise.resolve(rows).then(resolve, reject));
  return chain;
};

const queueSelect = (rows) => {
  const chain = createSelectChain(rows);
  mockDb.select.mockReturnValueOnce(chain);
  return chain;
};

const queueInsert = (rows, target = mockDb) => {
  const chain = createMutationChain(rows);
  target.insert.mockReturnValueOnce(chain);
  return chain;
};

const queueUpdate = (rows) => {
  const chain = createMutationChain(rows);
  mockDb.update.mockReturnValueOnce(chain);
  return chain;
};

const queueDelete = (rows) => {
  const chain = createMutationChain(rows);
  mockDb.delete.mockReturnValueOnce(chain);
  return chain;
};

describe('Drizzle repositories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('settings repository reads and saves with Drizzle builders', async () => {
    const selectChain = queueSelect([{ settingValue: { attendance: [] } }]);

    await expect(settingsRepository.getSetting('lessonScoring', 3)).resolves.toEqual({ attendance: [] });

    expect(mockDb.select).toHaveBeenCalledWith(expect.objectContaining({ settingValue: expect.any(Object) }));
    expect(selectChain.from).toHaveBeenCalled();
    expect(selectChain.where).toHaveBeenCalled();
    expect(selectChain.orderBy).toHaveBeenCalled();
    expect(selectChain.limit).toHaveBeenCalledWith(1);

    const insertChain = queueInsert([{ settingValue: { stellarBonusCoins: 30 } }]);

    await expect(settingsRepository.saveSetting('lessonScoring', { stellarBonusCoins: 30 })).resolves.toEqual({
      stellarBonusCoins: 30,
    });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalledWith({
      centerId: null,
      settingKey: 'lessonScoring',
      settingValue: { stellarBonusCoins: 30 },
    });
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
    expect(insertChain.returning).toHaveBeenCalledWith(expect.objectContaining({ settingValue: expect.any(Object) }));
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('translations repository uses builders, including bulk upsert transactions', async () => {
    const findChain = queueSelect([{ id: 'hello', english: 'Hello', uzbek: 'Salom' }]);
    await expect(translationRepository.findAll()).resolves.toEqual([{ id: 'hello', english: 'Hello', uzbek: 'Salom' }]);
    expect(findChain.orderBy).toHaveBeenCalled();

    const findByIdChain = queueSelect([{ id: 'hello', english: 'Hello', uzbek: 'Salom' }]);
    await expect(translationRepository.findById('hello')).resolves.toEqual({ id: 'hello', english: 'Hello', uzbek: 'Salom' });
    expect(findByIdChain.where).toHaveBeenCalled();

    const upsertChain = queueInsert([{ id: 'save', english: 'Save', uzbek: 'Saqlash' }]);
    await expect(translationRepository.upsert('save', 'Save', 'Saqlash')).resolves.toEqual({
      id: 'save',
      english: 'Save',
      uzbek: 'Saqlash',
    });
    expect(upsertChain.values).toHaveBeenCalledWith({ id: 'save', english: 'Save', uzbek: 'Saqlash' });
    expect(upsertChain.onConflictDoUpdate).toHaveBeenCalled();

    const tx = { insert: jest.fn() };
    queueInsert([{ id: 'a', english: 'A', uzbek: 'A' }], tx);
    queueInsert([{ id: 'b', english: 'B', uzbek: 'B' }], tx);
    mockDb.transaction.mockImplementationOnce((callback) => callback(tx));

    await expect(
      translationRepository.bulkUpsert([
        { id: 'a', english: 'A', uzbek: 'A' },
        { id: 'b', english: 'B', uzbek: 'B' },
      ])
    ).resolves.toEqual([
      { id: 'a', english: 'A', uzbek: 'A' },
      { id: 'b', english: 'B', uzbek: 'B' },
    ]);
    expect(tx.insert).toHaveBeenCalledTimes(2);

    const deleteChain = queueDelete([{ id: 'save', english: 'Save', uzbek: 'Saqlash' }]);
    await expect(translationRepository.remove('save')).resolves.toEqual({ id: 'save', english: 'Save', uzbek: 'Saqlash' });
    expect(deleteChain.where).toHaveBeenCalled();
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('saved filter repository scopes selects, inserts, updates, and deletes with builders', async () => {
    const selectChain = queueSelect([{ filterId: 1, name: 'Mine' }]);
    await expect(savedFilterRepository.findForUser('teacher', 7, 2, 'students')).resolves.toEqual([
      { filterId: 1, name: 'Mine' },
    ]);
    expect(selectChain.where).toHaveBeenCalled();
    expect(selectChain.orderBy).toHaveBeenCalled();

    const insertChain = queueInsert([{ filterId: 2 }]);
    await expect(savedFilterRepository.insert([2, 'teacher', 7, 'Fast', 'students', { q: 'Ali' }])).resolves.toEqual({
      filterId: 2,
    });
    expect(insertChain.values).toHaveBeenCalledWith({
      centerId: 2,
      userType: 'teacher',
      userId: 7,
      name: 'Fast',
      entity: 'students',
      filtersJson: { q: 'Ali' },
    });

    const updateChain = queueUpdate([]);
    await expect(savedFilterRepository.update(2, 'teacher', 7, 3, null, null)).resolves.toBeNull();
    expect(updateChain.set).toHaveBeenCalled();
    expect(updateChain.where).toHaveBeenCalled();

    const deleteChain = queueDelete([{ filterId: 2 }]);
    await expect(savedFilterRepository.remove(2, 'teacher', 7, 3)).resolves.toEqual({ filterId: 2 });
    expect(deleteChain.where).toHaveBeenCalled();
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('notifications repository uses builders for list, read, insert, and remove', async () => {
    const selectChain = queueSelect([{ notificationId: 1 }]);
    await expect(notificationRepository.findByUser('owner', 4, 2)).resolves.toEqual([{ notificationId: 1 }]);
    expect(selectChain.orderBy).toHaveBeenCalled();

    const insertChain = queueInsert([{ notificationId: 2 }]);
    await notificationRepository.insert([2, 'owner', 4, 'Title', 'Message', 'info']);
    expect(insertChain.values).toHaveBeenCalledWith({
      centerId: 2,
      userType: 'owner',
      userId: 4,
      title: 'Title',
      message: 'Message',
      type: 'info',
    });

    const updateChain = queueUpdate([{ notificationId: 2, isRead: true }]);
    await expect(notificationRepository.markRead(2, 'owner', 4)).resolves.toEqual({ notificationId: 2, isRead: true });
    expect(updateChain.set).toHaveBeenCalledWith({ isRead: true });

    const deleteChain = queueDelete([]);
    await expect(notificationRepository.remove(2, 'owner', 4, 2)).resolves.toBeNull();
    expect(deleteChain.returning).toHaveBeenCalled();
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('teacher payment repository uses builders for credential access', async () => {
    const selectChain = queueSelect([{ teacherId: 9, passwordHash: 'hash', isActive: true }]);
    await expect(teacherPaymentRepository.findByTeacherId(9)).resolves.toEqual({
      teacherId: 9,
      passwordHash: 'hash',
      isActive: true,
    });
    expect(selectChain.from).toHaveBeenCalled();
    expect(selectChain.where).toHaveBeenCalled();

    const insertChain = queueInsert([{ teacherId: 9, isActive: true, updatedAt: new Date('2026-01-01') }]);
    await teacherPaymentRepository.upsertPassword(9, 'new-hash', 1);
    expect(insertChain.values).toHaveBeenCalledWith({
      teacherId: 9,
      passwordHash: 'new-hash',
      createdBy: 1,
      updatedBy: 1,
    });
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();

    const updateChain = queueUpdate([]);
    await teacherPaymentRepository.markUsed(9);
    expect(updateChain.set).toHaveBeenCalled();
    expect(updateChain.where).toHaveBeenCalled();
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('rooms repository uses builders for room CRUD and conflict checks', async () => {
    const allChain = queueSelect([{ roomId: 1, className: 'A1' }]);
    await expect(roomsRepository.findAll(2)).resolves.toEqual([{ roomId: 1, className: 'A1' }]);
    expect(allChain.leftJoin).toHaveBeenCalled();
    expect(allChain.orderBy).toHaveBeenCalled();

    const byIdChain = queueSelect([{ roomId: 1 }]);
    await expect(roomsRepository.findById(1, 2)).resolves.toEqual({ roomId: 1 });
    expect(byIdChain.where).toHaveBeenCalled();

    const insertChain = queueInsert([{ roomId: 2 }]);
    await roomsRepository.insert([2, '101', 8, 'Monday', '09:00', '10:00']);
    expect(insertChain.values).toHaveBeenCalledWith({
      centerId: 2,
      roomNumber: '101',
      classId: 8,
      day: 'Monday',
      time: '09:00',
      endTime: '10:00',
    });

    const updateChain = queueUpdate([{ roomId: 2 }]);
    await roomsRepository.update(2, ['102', 9, 'Tuesday', '10:00', '11:00'], 3);
    expect(updateChain.set).toHaveBeenCalled();
    expect(updateChain.where).toHaveBeenCalled();

    const classChain = queueSelect([{ roomId: 2 }]);
    await roomsRepository.findByClassId(9, 3);
    expect(classChain.innerJoin).toHaveBeenCalled();

    const deleteChain = queueDelete([{ roomId: 2 }]);
    await expect(roomsRepository.remove(2, 3)).resolves.toEqual({ roomId: 2 });
    expect(deleteChain.where).toHaveBeenCalled();

    const conflictChain = queueSelect([{ roomId: 3 }]);
    await expect(roomsRepository.findConflict(3, ' 102 ', 'Tuesday', '10:30', '11:30', 2)).resolves.toEqual({ roomId: 3 });
    expect(conflictChain.limit).toHaveBeenCalledWith(1);
    expect(mockDb.execute).not.toHaveBeenCalled();
  });
});
