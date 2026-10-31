const mockQuery = jest.fn();
jest.mock('../../../../db/pool', () => ({ query: (...args) => mockQuery(...args) }));

const repo = require('../mobileNotification.repository');

const rows = (r) => Promise.resolve({ rows: r });

describe('mobile notification repository', () => {
  beforeEach(() => mockQuery.mockReset());

  // @MOB-041
  it('enqueue ignores a duplicate event and stores data as JSON', async () => {
    mockQuery.mockReturnValueOnce(rows([{ outbox_id: 5 }])).mockReturnValueOnce(rows([]));
    await expect(repo.enqueue({ userType: 'parent', userId: 1, category: 'grades', title: 't', body: 'b', data: { url: '/x' }, dedupeKey: 'k' })).resolves.toBe(5);
    expect(mockQuery.mock.calls[0][0]).toContain('ON CONFLICT (dedupe_key) DO NOTHING');
    expect(mockQuery.mock.calls[0][1][5]).toBe('{"url":"/x"}');
    await expect(repo.enqueue({ userType: 'parent', userId: 1, category: 'grades', title: 't', body: 'b', dedupeKey: 'k' })).resolves.toBeNull();
  });

  // @MOB-043
  it('a category is on unless turned off', async () => {
    mockQuery.mockReturnValueOnce(rows([])).mockReturnValueOnce(rows([{ enabled: false }]));
    await expect(repo.isCategoryEnabled('student', 1, 'coins')).resolves.toBe(true);
    await expect(repo.isCategoryEnabled('student', 1, 'coins')).resolves.toBe(false);
  });

  it('inbox returns rows with total and unread counts', async () => {
    mockQuery.mockReturnValueOnce(rows([{ notification_id: 1 }])).mockReturnValueOnce(rows([{ total: 4, unread: 2 }]));
    await expect(repo.listInbox('parent', 1, 10, 0)).resolves.toEqual({ rows: [{ notification_id: 1 }], total: 4, unread: 2 });
    mockQuery.mockReturnValueOnce(rows([])).mockReturnValueOnce(rows([]));
    await expect(repo.listInbox('parent', 1, 10, 0)).resolves.toEqual({ rows: [], total: 0, unread: 0 });
  });

  it('markRead targets one message or all of them', async () => {
    mockQuery.mockReturnValue(rows([]));
    await repo.markRead('parent', 1, 9);
    expect(mockQuery.mock.calls[0][1]).toEqual(['parent', 1, 9]);
    await repo.markRead('parent', 1);
    expect(mockQuery.mock.calls[1][1]).toEqual(['parent', 1]);
  });

  // @MOB-042
  it('checkpoints read null before the first run', async () => {
    mockQuery.mockReturnValueOnce(rows([])).mockReturnValueOnce(rows([{ last_id: '12' }]));
    await expect(repo.getCheckpoint('x')).resolves.toBeNull();
    await expect(repo.getCheckpoint('x')).resolves.toBe(12);
  });

  it('reads the newest id of each source table and new events after a checkpoint', async () => {
    mockQuery.mockReturnValueOnce(rows([{ max: 77 }]));
    await expect(repo.sourceMaxId('coins')).resolves.toBe(77);
    expect(mockQuery.mock.calls[0][0]).toContain('MAX(transaction_id)');

    mockQuery.mockReturnValueOnce(rows([{ id: 1 }]));
    await expect(repo.newEvents('payments', 5, 100)).resolves.toEqual([{ id: 1 }]);
    expect(mockQuery.mock.calls[1][1]).toEqual([5, 100]);
  });

  it('finds parents of any record of the child', async () => {
    mockQuery.mockReturnValueOnce(rows([{ parent_id: '3' }, { parent_id: 4 }]));
    await expect(repo.parentsOf([7, 8])).resolves.toEqual([3, 4]);
  });

  it('passes the remaining statements through', async () => {
    mockQuery.mockReturnValue(rows([{ ok: 1 }]));
    await repo.listPrefs('student', 1);
    await repo.setPref('student', 1, 'coins', false);
    await repo.setPushToken(2, 'student', 1, 'ExponentPushToken[a]');
    await repo.pushTokensFor('student', 1);
    await repo.clearPushToken('ExponentPushToken[a]');
    await repo.dueMessages(10);
    await repo.markDelivered(1, 'sent');
    await repo.markRetry(1, 'x'.repeat(600), 60, false);
    await repo.setCheckpoint('x', 3);
    expect(mockQuery).toHaveBeenCalledTimes(9);
    expect(mockQuery.mock.calls[7][1][1]).toHaveLength(500);
  });
});
