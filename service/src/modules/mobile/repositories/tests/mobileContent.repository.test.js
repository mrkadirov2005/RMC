const mockQuery = jest.fn();
const mockClient = { query: jest.fn(), release: jest.fn() };
jest.mock('../../../../db/pool', () => ({ query: (...args) => mockQuery(...args), connect: async () => mockClient }));

const repo = require('../mobileContent.repository');

const rows = (r) => Promise.resolve({ rows: r });

describe('mobile content repository', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  it('audienceOf reads a student own records or a parent children records', async () => {
    mockQuery.mockReturnValueOnce(rows([{ center_id: 2, class_id: 3 }, { center_id: 2, class_id: 4 }, { center_id: 2, class_id: null }]));
    await expect(repo.audienceOf('student', 7)).resolves.toEqual({ centerIds: [2], classIds: [3, 4] });
    expect(mockQuery.mock.calls[0][0]).toContain('main_student_id = $1');

    mockQuery.mockReturnValueOnce(rows([]));
    await expect(repo.audienceOf('parent', 11)).resolves.toEqual({ centerIds: [], classIds: [] });
    expect(mockQuery.mock.calls[1][0]).toContain('parent_students');
  });

  it('announcements return items and a total', async () => {
    mockQuery.mockReturnValueOnce(rows([{ announcement_id: 1 }])).mockReturnValueOnce(rows([{ total: 9 }]));
    await expect(repo.announcementsFor('parent', [2], [3], 10, 0)).resolves.toEqual({ items: [{ announcement_id: 1 }], total: 9 });
    mockQuery.mockReturnValueOnce(rows([])).mockReturnValueOnce(rows([]));
    await expect(repo.announcementsFor('parent', [2], [3], 10, 0)).resolves.toEqual({ items: [], total: 0 });
  });

  it('single-row writes return the row or null', async () => {
    mockQuery.mockReturnValue(rows([{ id: 1 }]));
    await expect(repo.createHelpRequest({ centerId: 2, userType: 'parent', userId: 1, studentId: null, kind: 'help', message: 'm' })).resolves.toEqual({ id: 1 });
    await expect(repo.adminCreateLink({ center_id: 2, title: 't', url: 'u' })).resolves.toEqual({ id: 1 });
    await expect(repo.adminCreateAnnouncement({ center_id: 2, title: 't', body: 'b', audience: 'all' })).resolves.toEqual({ id: 1 });
    mockQuery.mockReturnValue(rows([]));
    await expect(repo.adminUpdateLink(1, 2, {})).resolves.toBeNull();
    await expect(repo.adminDeleteLink(1, 2)).resolves.toBeNull();
    await expect(repo.adminDeleteAnnouncement(1, 2)).resolves.toBeNull();
    await expect(repo.adminUpdateHelpRequest(1, 2, {})).resolves.toBeNull();
  });

  it('enqueueAnnouncement returns how many messages were queued', async () => {
    mockQuery.mockReturnValueOnce(rows([{ outbox_id: 1 }, { outbox_id: 2 }]));
    await expect(repo.enqueueAnnouncement({ announcement_id: 5, center_id: 2, audience: 'all', title: 't', body: 'b' })).resolves.toBe(2);
    expect(mockQuery.mock.calls[0][1]).toEqual([2, null, 'all', 't', 'b', '5']);
  });

  it('list queries apply the center filter only when scoped', async () => {
    mockQuery.mockReturnValue(rows([]));
    await repo.adminListLinks(null);
    await repo.adminListLinks(2);
    expect(mockQuery.mock.calls[0][1]).toEqual([]);
    expect(mockQuery.mock.calls[1][1]).toEqual([2]);
    await repo.adminListPolicies(null);
    await repo.adminListPolicies(2);
    await repo.linksFor([2]);
    await repo.policiesFor([2], 'parent', 1);
    await repo.acceptPolicy(1, 2, 'parent', 1);
    await repo.helpRequestsOf('parent', 1);
    await repo.adminListAnnouncements(2);
    await repo.adminPolicyVersions(1);
    await repo.adminListHelpRequests(2, null);
    expect(mockQuery).toHaveBeenCalledTimes(11);
  });

  // @MOB-162
  it('creates a rule with its first version in one transaction', async () => {
    mockClient.query.mockImplementation((sql) => rows(sql.startsWith('INSERT INTO mobile_policies ') ? [{ policy_id: 4 }] : []));
    await expect(repo.adminCreatePolicy({ center_id: 2, title: 't', body: 'b' })).resolves.toEqual({ policy_id: 4 });
    expect(mockClient.query.mock.calls.map((c) => c[0].split(' ')[0])).toEqual(['BEGIN', 'INSERT', 'INSERT', 'COMMIT']);
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rolls back a failed rule and an unknown rule version', async () => {
    mockClient.query.mockImplementation((sql) => (sql.startsWith('INSERT') ? Promise.reject(new Error('boom')) : rows([])));
    await expect(repo.adminCreatePolicy({ center_id: 2, title: 't', body: 'b' })).rejects.toThrow('boom');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');

    mockClient.query.mockReset();
    mockClient.query.mockImplementation(() => rows([]));
    await expect(repo.adminPublishPolicyVersion(9, 2, { body: 'b' })).resolves.toBeNull();
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('publishes a new version after bumping the rule', async () => {
    mockClient.query.mockImplementation((sql) => rows(sql.startsWith('UPDATE') ? [{ policy_id: 1, current_version: 2 }] : []));
    await expect(repo.adminPublishPolicyVersion(1, null, { body: 'b' })).resolves.toEqual({ policy_id: 1, current_version: 2 });
    expect(mockClient.query.mock.calls.at(-1)[0]).toBe('COMMIT');

    mockClient.query.mockReset();
    mockClient.query.mockImplementation((sql) => (sql.startsWith('UPDATE') ? Promise.reject(new Error('x')) : rows([])));
    await expect(repo.adminPublishPolicyVersion(1, null, { body: 'b' })).rejects.toThrow('x');
  });
});
