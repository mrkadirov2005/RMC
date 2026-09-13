const mockCollection = {
  countDocuments: jest.fn(),
  find: jest.fn(),
};
const mockDb = { collection: jest.fn(() => mockCollection) };
const getMongoDb = jest.fn();

jest.mock('../../db/mongo', () => ({ getMongoDb }));

const request = require('supertest');
const express = require('express');
const requestLogRoutes = require('../requestLogRoutes');

const app = express();
app.use('/request-logs', requestLogRoutes);

const queueFind = (items = []) => {
  const cursor = {};
  cursor.sort = jest.fn(() => cursor);
  cursor.skip = jest.fn(() => cursor);
  cursor.limit = jest.fn(() => cursor);
  cursor.toArray = jest.fn(() => Promise.resolve(items));
  mockCollection.find.mockReturnValue(cursor);
  return cursor;
};

const lastFilter = () => mockCollection.find.mock.calls[0][0];

describe('request log routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMongoDb.mockResolvedValue(mockDb);
    mockCollection.countDocuments.mockResolvedValue(0);
    queueFind([]);
  });

  it('reports the feature as unavailable when Mongo is not configured', async () => {
    getMongoDb.mockResolvedValue(null);

    const response = await request(app).get('/request-logs').expect(503);

    expect(response.body).toEqual({ error: 'MongoDB is not configured (request logs disabled).' });
  });

  it('returns the page alongside its total', async () => {
    mockCollection.countDocuments.mockResolvedValue(42);
    queueFind([{ requestId: 'abc' }]);

    const response = await request(app).get('/request-logs').expect(200);

    expect(response.body).toEqual({ total: 42, limit: 50, skip: 0, items: [{ requestId: 'abc' }] });
  });

  it('defaults to fifty rows from the start', async () => {
    const cursor = queueFind([]);

    await request(app).get('/request-logs').expect(200);

    expect(cursor.limit).toHaveBeenCalledWith(50);
    expect(cursor.skip).toHaveBeenCalledWith(0);
    expect(cursor.sort).toHaveBeenCalledWith({ ts: -1 });
  });

  it('caps the page size at two hundred', async () => {
    const cursor = queueFind([]);

    await request(app).get('/request-logs?limit=5000').expect(200);

    expect(cursor.limit).toHaveBeenCalledWith(200);
  });

  it('raises a page size below one back to a single row', async () => {
    const cursor = queueFind([]);

    await request(app).get('/request-logs?limit=0').expect(200);

    expect(cursor.limit).toHaveBeenCalledWith(1);
  });

  it('falls back to the default page size when the limit is not a number', async () => {
    const cursor = queueFind([]);

    await request(app).get('/request-logs?limit=many').expect(200);

    expect(cursor.limit).toHaveBeenCalledWith(50);
  });

  it('truncates a fractional skip', async () => {
    const cursor = queueFind([]);

    await request(app).get('/request-logs?skip=10.9').expect(200);

    expect(cursor.skip).toHaveBeenCalledWith(10);
  });

  describe('audience tabs', () => {
    it('matches owners case-insensitively', async () => {
      await request(app).get('/request-logs?kind=owner').expect(200);

      expect(lastFilter()).toMatchObject({ userType: 'superuser', role: { $regex: '^owner$', $options: 'i' } });
    });

    it('excludes owners from the superuser tab', async () => {
      await request(app).get('/request-logs?kind=superuser').expect(200);

      expect(lastFilter()).toMatchObject({ userType: 'superuser', role: { $ne: 'owner' } });
    });

    it.each(['teacher', 'student'])('narrows the %s tab by user type', async (kind) => {
      await request(app).get(`/request-logs?kind=${kind}`).expect(200);

      expect(lastFilter()).toMatchObject({ userType: kind });
    });

    it('leaves the filter open for an unknown tab', async () => {
      await request(app).get('/request-logs?kind=aliens').expect(200);

      expect(lastFilter()).toEqual({});
    });
  });

  describe('free-text search', () => {
    it('searches across the identifying fields', async () => {
      await request(app).get('/request-logs?q=ada').expect(200);

      const filter = lastFilter();
      expect(filter.$or).toHaveLength(9);
      expect(filter.$or[0].requestId).toBeInstanceOf(RegExp);
    });

    it('treats regular expression characters in the term as literal text', async () => {
      await request(app).get('/request-logs?q=' + encodeURIComponent('a.*b')).expect(200);

      expect(lastFilter().$or[0].requestId.source).toBe('a\\.\\*b');
    });
  });

  describe('outcome filters', () => {
    it('treats a success filter as completed and not aborted', async () => {
      await request(app).get('/request-logs?result=success').expect(200);

      expect(lastFilter()).toMatchObject({ success: true, aborted: { $ne: true } });
    });

    it('treats a failure filter as completed and not aborted', async () => {
      await request(app).get('/request-logs?result=failed').expect(200);

      expect(lastFilter()).toMatchObject({ success: false, aborted: { $ne: true } });
    });

    it('treats an aborted filter as aborted regardless of status', async () => {
      await request(app).get('/request-logs?result=aborted').expect(200);

      expect(lastFilter()).toMatchObject({ aborted: true });
      expect(lastFilter().success).toBeUndefined();
    });

    it('upper-cases the method filter', async () => {
      await request(app).get('/request-logs?method=post').expect(200);

      expect(lastFilter().method).toBe('POST');
    });
  });

  describe('numeric ranges', () => {
    it('prefers an exact status code over a range', async () => {
      await request(app).get('/request-logs?statusCode=404&statusMin=500').expect(200);

      expect(lastFilter().statusCode).toBe(404);
    });

    it('builds a status range from both ends', async () => {
      await request(app).get('/request-logs?statusMin=400&statusMax=499').expect(200);

      expect(lastFilter().statusCode).toEqual({ $gte: 400, $lte: 499 });
    });

    it('builds a half-open status range', async () => {
      await request(app).get('/request-logs?statusMin=500').expect(200);

      expect(lastFilter().statusCode).toEqual({ $gte: 500 });
    });

    it('builds a duration range', async () => {
      await request(app).get('/request-logs?durationMin=100&durationMax=2000').expect(200);

      expect(lastFilter().durationMs).toEqual({ $gte: 100, $lte: 2000 });
    });

    it('ignores a range bound that is not a number', async () => {
      await request(app).get('/request-logs?durationMin=fast').expect(200);

      expect(lastFilter().durationMs).toBeUndefined();
    });

    it('ignores an empty range bound', async () => {
      await request(app).get('/request-logs?statusMin=').expect(200);

      expect(lastFilter().statusCode).toBeUndefined();
    });
  });

  describe('field filters', () => {
    it.each([
      ['username', 'username'],
      ['ip', 'ip'],
      ['requestId', 'requestId'],
      ['deviceId', 'deviceId'],
    ])('matches %s as a case-insensitive substring', async (param, field) => {
      await request(app).get(`/request-logs?${param}=ada`).expect(200);

      expect(lastFilter()[field]).toEqual({ $regex: 'ada', $options: 'i' });
    });

    it('matches a path against both the path and the full URL', async () => {
      await request(app).get('/request-logs?path=' + encodeURIComponent('/api/students')).expect(200);

      const clause = lastFilter().$and[0];
      expect(clause.$or).toHaveLength(2);
    });

    it('adds the role filter alongside an existing path filter', async () => {
      await request(app).get('/request-logs?path=/api&role=owner').expect(200);

      expect(lastFilter().$and).toHaveLength(2);
    });
  });

  describe('time window', () => {
    it('builds a range from both ends', async () => {
      await request(app).get('/request-logs?from=2026-09-01&to=2026-09-30').expect(200);

      const ts = lastFilter().ts;
      expect(ts.$gte).toBeInstanceOf(Date);
      expect(ts.$lte).toBeInstanceOf(Date);
    });

    it('ignores an unparseable date', async () => {
      await request(app).get('/request-logs?from=not-a-date').expect(200);

      expect(lastFilter().ts).toBeUndefined();
    });
  });

  it('projects only the log fields the console renders', async () => {
    await request(app).get('/request-logs').expect(200);

    const projection = mockCollection.find.mock.calls[0][1].projection;
    expect(projection).toMatchObject({ requestId: 1, statusCode: 1, failureReason: 1 });
    expect(projection).not.toHaveProperty('_id');
  });

  it('reports a database failure as a 500', async () => {
    mockCollection.countDocuments.mockRejectedValue(new Error('mongo down'));

    const response = await request(app).get('/request-logs').expect(500);

    expect(response.body).toEqual({ error: 'Failed to fetch request logs', details: 'mongo down' });
  });
});
