jest.mock('../../../../db/pool', () => {
  const pool = { query: jest.fn(), connect: jest.fn() };
  return pool;
});
jest.mock('../../../../shared/password', () => ({ hashPassword: jest.fn(() => 'hashed-random') }));

const pool = require('../../../../db/pool');
const repository = require('../parent_link_request.repository');

const pendingRequest = {
  request_id: 4,
  center_id: 1,
  student_id: 9,
  telegram_chat_id: 555,
  telegram_user_id: 777,
  parent_name: 'Dilnoza Karimova',
  parent_phone: '+998 90 123 45 67',
  status: 'Pending',
  student_first_name: 'Ali',
  student_last_name: '<Valiyev>',
};

// A client that answers each query by matching its SQL, and records every call.
const createClient = ({ request = pendingRequest, existingParent = null } = {}) => {
  const calls = [];
  const client = {
    calls,
    release: jest.fn(),
    query: jest.fn(async (text, params) => {
      calls.push({ text: String(text), params });
      const sql = String(text);
      if (sql.includes('FROM parent_link_requests r') && sql.includes('FOR UPDATE')) return { rows: request ? [request] : [] };
      if (sql.includes('SELECT parent_id FROM parents')) return { rows: existingParent ? [existingParent] : [] };
      if (sql.includes('INSERT INTO parents')) return { rows: [{ parent_id: 31 }] };
      if (sql.includes('UPDATE parent_link_requests')) return { rows: [{ ...request, status: sql.includes("'Approved'") ? 'Approved' : 'Rejected' }] };
      return { rows: [] };
    }),
  };
  pool.connect.mockResolvedValue(client);
  return client;
};

const findCall = (client, fragment) => client.calls.find((call) => call.text.includes(fragment));

describe('parent link request repository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('approves: creates the parent, links the child and the chat, and tells only that chat', async () => {
    const client = createClient();
    const result = await repository.approve(4, 1, 2);

    expect(result.parent_id).toBe(31);
    expect(findCall(client, 'INSERT INTO parents').params).toEqual([1, 'Dilnoza', 'Karimova', '+998 90 123 45 67', 'tg_777_1', 'hashed-random']);
    expect(findCall(client, 'INSERT INTO parent_students').params).toEqual([31, 9, 1]);
    expect(findCall(client, 'INSERT INTO telegram_links').params).toEqual([1, 9, 555, 777, '+998 90 123 45 67']);
    const message = findCall(client, 'INSERT INTO telegram_outbox');
    expect(message.params[2]).toBe('parent_link_approved');
    expect(message.params[5]).toBe(555);
    // The child's name is escaped for Telegram's HTML.
    expect(message.params[3]).toContain('Ali &lt;Valiyev&gt;');
    expect(client.calls.map((call) => call.text)).toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('reuses a parent already saved with the same phone in the center', async () => {
    const client = createClient({ existingParent: { parent_id: 12 } });
    const result = await repository.approve(4, 1, 2);

    expect(result.parent_id).toBe(12);
    expect(findCall(client, 'SELECT parent_id FROM parents').params).toEqual([1, '901234567']);
    expect(findCall(client, 'INSERT INTO parents')).toBeUndefined();
  });

  it('rejects: marks it rejected and tells the parent, without linking anything', async () => {
    const client = createClient();
    const result = await repository.reject(4, 1, 2);

    expect(result.request.status).toBe('Rejected');
    expect(findCall(client, 'INSERT INTO telegram_links')).toBeUndefined();
    expect(findCall(client, 'INSERT INTO parent_students')).toBeUndefined();
    expect(findCall(client, 'INSERT INTO telegram_outbox').params[2]).toBe('parent_link_rejected');
  });

  it('refuses a request that was already decided', async () => {
    const client = createClient({ request: { ...pendingRequest, status: 'Approved' } });
    const result = await repository.approve(4, 1, 2);

    expect(result).toEqual({ error: 'already_decided', status: 'Approved' });
    expect(findCall(client, 'INSERT INTO telegram_links')).toBeUndefined();
  });

  it('treats a request from another center as not found', async () => {
    const client = createClient({ request: null });
    const result = await repository.reject(4, 3, 2);

    expect(result).toEqual({ error: 'not_found' });
    expect(findCall(client, 'FOR UPDATE').params).toEqual([4, 3]);
  });

  it('rolls back when a step fails', async () => {
    const client = createClient();
    client.query.mockImplementationOnce(async () => ({ rows: [] }))
      .mockImplementationOnce(async () => { throw new Error('boom'); });

    await expect(repository.approve(4, 1, 2)).rejects.toThrow('boom');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('lists pending requests first, scoped to the center and status', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await repository.list(1, 'Pending');
    const [text, params] = pool.query.mock.calls[0];
    expect(params).toEqual([1, 'Pending']);
    expect(text).toContain('r.center_id = $1');
    expect(text).toContain("ORDER BY (r.status = 'Pending') DESC");
  });
});
