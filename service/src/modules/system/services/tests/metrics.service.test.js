const getMongoDb = jest.fn();
jest.mock('../../../../db/mongo', () => ({ getMongoDb }));
const service = require('../metrics.service');

describe('metrics service', () => {
  test('a gap between samples longer than 2.5 minutes is an outage', () => {
    const t0 = Date.parse('2026-10-22T10:00:00Z');
    const outages = service.findOutages([t0, t0 + 60000, t0 + 120000, t0 + 120000 + 12 * 60000, t0 + 120000 + 13 * 60000]);
    expect(outages).toEqual([{ from: '2026-10-22T10:02:00.000Z', to: '2026-10-22T10:14:00.000Z', minutes: 12 }]);
    expect(service.findOutages([t0, t0 + 60000])).toEqual([]);
  });

  test('a sample reads percentages in range', () => {
    const sample = service.takeSample(true);
    expect(sample.boot).toBe(true);
    for (const key of ['cpu', 'processCpu', 'memoryPercent']) {
      expect(sample[key]).toBeGreaterThanOrEqual(0);
      expect(sample[key]).toBeLessThanOrEqual(100);
    }
  });

  test('the quiet window is the longest low-traffic run, wrapping past midnight', () => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, requests: hour >= 8 && hour <= 20 ? 100 : 2, errors: 0 }));
    expect(service.quietWindow(hours)).toEqual({ from: 21, to: 8, hours: 11 });
    expect(service.quietWindow(hours.map((h) => ({ ...h, requests: 0 })))).toBeNull();
    expect(service.quietWindow(hours.map((h) => ({ ...h, requests: 50 })))).toBeNull();
  });

  test('reports disabled history and traffic when MongoDB is not configured', async () => {
    getMongoDb.mockResolvedValue(null);
    await expect(service.getHistory(1)).resolves.toMatchObject({ enabled: false, points: [] });
    await expect(service.getTraffic(7)).resolves.toMatchObject({ enabled: false, days: 7 });
  });

  test('traffic is averaged per day and the busiest hour found', async () => {
    const aggregate = jest.fn()
      .mockReturnValueOnce({ toArray: async () => [{ _id: '2026-10-22 15:00', requests: 70, errors: 1, slow: 0, avgMs: 40 }] })
      .mockReturnValueOnce({ toArray: async () => [{ _id: 15, requests: 70, errors: 1, slow: 0, avgMs: 40 }, { _id: 3, requests: 7, errors: 0, slow: 0, avgMs: 20 }] })
      .mockReturnValueOnce({ toArray: async () => [{ _id: null, requests: 77, errors: 1, slow: 0, avgMs: 38 }] });
    getMongoDb.mockResolvedValue({ collection: () => ({ aggregate }) });
    const result = await service.getTraffic(7);
    expect(result.hours[15]).toMatchObject({ requests: 10, total: 70 });
    expect(result.summary).toMatchObject({ total: 77, busiestHour: 15, errorPercent: 1.3 });
  });
});
