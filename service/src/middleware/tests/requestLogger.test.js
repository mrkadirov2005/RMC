const mockCollection = { insertOne: jest.fn(() => Promise.resolve()) };
const mockDb = { collection: jest.fn(() => mockCollection) };
const getMongoDb = jest.fn(() => Promise.resolve(mockDb));

jest.mock('../../db/mongo', () => ({ getMongoDb }));

const { requestLogger } = require('../requestLogger');

const createRequest = (overrides = {}) => ({
  method: 'get',
  path: '/api/students',
  originalUrl: '/api/students?page=2',
  headers: {},
  socket: {},
  connection: {},
  ...overrides,
});

const createResponse = (overrides = {}) => {
  const listeners = {};
  const res = {
    statusCode: 200,
    locals: {},
    writableEnded: false,
    setHeader: jest.fn(),
    json: jest.fn((payload) => payload),
    send: jest.fn((payload) => payload),
    on: jest.fn((event, handler) => {
      listeners[event] = handler;
    }),
    emit: (event) => listeners[event] && listeners[event](),
    ...overrides,
  };
  return res;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

const lastDoc = () => mockCollection.insertOne.mock.calls[0][0];

describe('request logger middleware', () => {
  beforeEach(() => {
    mockCollection.insertOne.mockClear().mockResolvedValue(undefined);
    mockDb.collection.mockClear();
    getMongoDb.mockClear().mockResolvedValue(mockDb);
  });

  it('passes the request along and stamps a request id on the response', () => {
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
  });

  it('reuses an incoming request id rather than minting a new one', async () => {
    const req = createRequest({ headers: { 'x-request-id': 'trace-42' } });
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'trace-42');

    res.emit('finish');
    await flush();

    expect(lastDoc().requestId).toBe('trace-42');
  });

  it('survives a response that refuses header writes', () => {
    const req = createRequest();
    const res = createResponse({
      setHeader: jest.fn(() => {
        throw new Error('headers already sent');
      }),
    });
    const next = jest.fn();

    expect(() => requestLogger(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  it('writes a success record for a 2xx response', async () => {
    const req = createRequest({ user: { id: 7, userType: 'teacher', role: 'staff', username: 'ada' } });
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.emit('finish');
    await flush();

    expect(mockDb.collection).toHaveBeenCalledWith('request_logs');
    expect(lastDoc()).toMatchObject({
      method: 'GET',
      path: '/api/students',
      originalUrl: '/api/students?page=2',
      statusCode: 200,
      success: true,
      aborted: false,
      userId: 7,
      userType: 'teacher',
      role: 'staff',
      username: 'ada',
      failureReason: null,
      failureDetails: null,
    });
  });

  it('captures the error payload of a failed response', async () => {
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.statusCode = 400;
    res.json({ error: 'Validation failed', details: { field: 'email' } });
    res.emit('finish');
    await flush();

    expect(lastDoc()).toMatchObject({
      success: false,
      failureReason: 'Validation failed',
      failureDetails: '{"field":"email"}',
    });
  });

  it('captures a plain string error body sent through send', async () => {
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.statusCode = 500;
    res.send('Internal failure');
    res.emit('finish');
    await flush();

    expect(lastDoc()).toMatchObject({ failureReason: 'Internal failure', failureDetails: null });
  });

  it('ignores the body of a successful response when looking for failures', async () => {
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.json({ error: 'not really an error' });
    res.emit('finish');
    await flush();

    expect(lastDoc().failureReason).toBeNull();
  });

  it('still forwards the payload to the original json and send methods', () => {
    const req = createRequest();
    const originalJson = jest.fn((payload) => payload);
    const originalSend = jest.fn((payload) => payload);
    const res = createResponse({ json: originalJson, send: originalSend });

    requestLogger(req, res, jest.fn());
    res.json({ ok: true });
    res.send('body');

    expect(originalJson).toHaveBeenCalledWith({ ok: true });
    expect(originalSend).toHaveBeenCalledWith('body');
  });

  it('records a connection that closed before the response finished as aborted', async () => {
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.emit('close');
    await flush();

    expect(lastDoc()).toMatchObject({ aborted: true, success: false });
  });

  it('does not log twice when close follows finish', async () => {
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.emit('finish');
    await flush();
    res.emit('close');
    await flush();

    expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
  });

  it('skips the close handler once the response has ended', async () => {
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.writableEnded = true;
    res.emit('close');
    await flush();

    expect(mockCollection.insertOne).not.toHaveBeenCalled();
  });

  describe('client address resolution', () => {
    it.each([
      ['x-forwarded-for', { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' }, '203.0.113.5'],
      ['x-real-ip', { 'x-real-ip': '203.0.113.6' }, '203.0.113.6'],
      ['cf-connecting-ip', { 'cf-connecting-ip': '203.0.113.7' }, '203.0.113.7'],
    ])('prefers the %s header', async (_name, headers, expected) => {
      const req = createRequest({ headers });
      const res = createResponse();

      requestLogger(req, res, jest.fn());
      res.emit('finish');
      await flush();

      expect(lastDoc().ip).toBe(expected);
    });

    it('falls back to the socket address when no proxy header is present', async () => {
      const req = createRequest({ socket: { remoteAddress: '10.1.1.1' } });
      const res = createResponse();

      requestLogger(req, res, jest.fn());
      res.emit('finish');
      await flush();

      expect(lastDoc().ip).toBe('10.1.1.1');
    });

    it('records a null address when nothing identifies the caller', async () => {
      const req = createRequest();
      const res = createResponse();

      requestLogger(req, res, jest.fn());
      res.emit('finish');
      await flush();

      expect(lastDoc().ip).toBeNull();
    });
  });

  describe('caller identification', () => {
    it('prefers the authenticated username over the request body', async () => {
      const req = createRequest({ user: { username: 'ada' }, body: { username: 'someone-else' } });
      const res = createResponse();

      requestLogger(req, res, jest.fn());
      res.emit('finish');
      await flush();

      expect(lastDoc().username).toBe('ada');
    });

    it.each(['username', 'email', 'login'])(
      'captures the attempted %s on a login route with no session yet',
      async (field) => {
        const req = createRequest({ body: { [field]: 'attempted@example.com' } });
        const res = createResponse();

        requestLogger(req, res, jest.fn());
        res.emit('finish');
        await flush();

        expect(lastDoc().username).toBe('attempted@example.com');
      },
    );

    it('reads the device id from either supported header', async () => {
      const req = createRequest({ headers: { 'x-client-id': 'device-9' } });
      const res = createResponse();

      requestLogger(req, res, jest.fn());
      res.emit('finish');
      await flush();

      expect(lastDoc().deviceId).toBe('device-9');
    });
  });

  it('truncates an oversized failure payload', async () => {
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.statusCode = 500;
    res.json({ error: 'boom', details: 'x'.repeat(5000) });
    res.emit('finish');
    await flush();

    const details = lastDoc().failureDetails;
    expect(details.endsWith('…')).toBe(true);
    expect(details.length).toBeLessThan(1300);
  });

  it('records null details when the failure payload cannot be serialized', async () => {
    const req = createRequest();
    const res = createResponse();
    const circular = {};
    circular.self = circular;

    requestLogger(req, res, jest.fn());
    res.statusCode = 500;
    res.json({ error: 'boom', details: circular });
    res.emit('finish');
    await flush();

    expect(lastDoc().failureDetails).toBeNull();
  });

  it('writes nothing when no Mongo connection is available', async () => {
    getMongoDb.mockResolvedValue(null);
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.emit('finish');
    await flush();

    expect(mockCollection.insertOne).not.toHaveBeenCalled();
  });

  it('never lets a logging failure escape into the request lifecycle', async () => {
    getMongoDb.mockRejectedValue(new Error('mongo down'));
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());

    expect(() => res.emit('finish')).not.toThrow();
    await flush();
  });

  it('swallows a rejected insert', async () => {
    mockCollection.insertOne.mockReturnValue(Promise.reject(new Error('write failed')));
    const req = createRequest();
    const res = createResponse();

    requestLogger(req, res, jest.fn());
    res.emit('finish');
    await flush();

    expect(mockCollection.insertOne).toHaveBeenCalled();
  });
});
