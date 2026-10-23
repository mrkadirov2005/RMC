export {};

// Server load history and request traffic for the Engineering "Monitoring" tab.
// A sample of CPU and memory is saved to MongoDB every minute (server_metrics); the request flow is
// worked out from the request_logs the API already writes. Times are shown in Tashkent (UTC+5).
const os = require('os');
const { getMongoDb } = require('../../../db/mongo');

const SAMPLE_EVERY_MS = 60 * 1000;
// A gap longer than this between two samples means the server was not running.
const OUTAGE_GAP_MS = 150 * 1000;
const KEEP_DAYS = Number(process.env.SERVER_METRICS_TTL_DAYS || 30);
const TIMEZONE = 'Asia/Tashkent';
const MB = 1024 * 1024;

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const cpuTimes = () => os.cpus().reduce((sum: { idle: number; total: number }, cpu: any) => {
  const total = Object.values(cpu.times).reduce((a: number, b: any) => a + Number(b), 0) as number;
  return { idle: sum.idle + cpu.times.idle, total: sum.total + total };
}, { idle: 0, total: 0 });

let lastCpu = cpuTimes();
let lastProcessCpu = process.cpuUsage();
let lastProcessAt = Date.now();
let timer: any = null;

/** One reading: how busy the machine's CPU was since the last reading, and the memory in use. */
const takeSample = (boot = false) => {
  const now = Date.now();
  const cpu = cpuTimes();
  const totalDelta = cpu.total - lastCpu.total;
  const cpuPercent = totalDelta > 0 ? (1 - (cpu.idle - lastCpu.idle) / totalDelta) * 100 : 0;
  lastCpu = cpu;

  const used = process.cpuUsage(lastProcessCpu);
  const elapsedMs = Math.max(1, now - lastProcessAt);
  const processCpuPercent = ((used.user + used.system) / 1000 / elapsedMs / Math.max(os.cpus().length, 1)) * 100;
  lastProcessCpu = process.cpuUsage();
  lastProcessAt = now;

  const total = os.totalmem();
  const memory = process.memoryUsage();
  return {
    ts: new Date(now),
    boot,
    cpu: round(Math.min(100, Math.max(0, cpuPercent))),
    processCpu: round(Math.min(100, Math.max(0, processCpuPercent))),
    load1: round(os.loadavg()[0], 2),
    memoryPercent: round(((total - os.freemem()) / total) * 100),
    rssMb: round(memory.rss / MB),
    heapMb: round(memory.heapUsed / MB),
  };
};

const saveSample = async (boot = false) => {
  try {
    const db = await getMongoDb();
    if (!db) return;
    await db.collection('server_metrics').insertOne(takeSample(boot));
  } catch {
    // Monitoring must never break the API.
  }
};

const startSampler = async () => {
  if (timer) return;
  try {
    const db = await getMongoDb();
    if (!db) return;
    const col = db.collection('server_metrics');
    await col.createIndex({ ts: 1 }, { expireAfterSeconds: Math.floor(KEEP_DAYS * 24 * 60 * 60) });
  } catch {
    return;
  }
  await saveSample(true);
  timer = setInterval(() => { void saveSample(false); }, SAMPLE_EVERY_MS);
  timer.unref?.();
};

const stopSampler = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

const rangeOf = (value: unknown, allowed: number[], fallback: number) => {
  const days = Number(value);
  return allowed.includes(days) ? days : fallback;
};

/** Stretches where no sample arrived: the server was off or restarting. */
const findOutages = (times: number[], gapMs = OUTAGE_GAP_MS) => {
  const outages: Array<{ from: string; to: string; minutes: number }> = [];
  for (let i = 1; i < times.length; i += 1) {
    const gap = times[i] - times[i - 1];
    if (gap > gapMs) outages.push({ from: new Date(times[i - 1]).toISOString(), to: new Date(times[i]).toISOString(), minutes: Math.round(gap / 60000) });
  }
  return outages;
};

const bucketMsFor = (days: number) => (days <= 1 ? 5 : days <= 7 ? 30 : 120) * 60 * 1000;

/** CPU and memory over the last `days` days, averaged and peaked per bucket, plus the downtime gaps. */
const getHistory = async (daysInput?: unknown) => {
  const days = rangeOf(daysInput, [1, 7, 30], 1);
  const db = await getMongoDb();
  if (!db) return { enabled: false, days, bucketMinutes: 0, points: [], outages: [], restarts: [], summary: null };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const bucketMs = bucketMsFor(days);
  const col = db.collection('server_metrics');
  const toLong = { $toLong: '$ts' };
  const [grouped, stamps, boots] = await Promise.all([
    col.aggregate([
      { $match: { ts: { $gte: since } } },
      { $group: {
        _id: { $subtract: [toLong, { $mod: [toLong, bucketMs] }] },
        cpu: { $avg: '$cpu' }, cpuMax: { $max: '$cpu' },
        memory: { $avg: '$memoryPercent' }, memoryMax: { $max: '$memoryPercent' },
        processCpu: { $avg: '$processCpu' }, rssMb: { $avg: '$rssMb' }, heapMb: { $avg: '$heapMb' }, load1: { $avg: '$load1' },
        samples: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
    ]).toArray(),
    col.find({ ts: { $gte: since } }, { projection: { ts: 1, _id: 0 } }).sort({ ts: 1 }).toArray(),
    col.find({ ts: { $gte: since }, boot: true }, { projection: { ts: 1, _id: 0 } }).sort({ ts: 1 }).toArray(),
  ]);

  const points = grouped.map((row: any) => ({
    ts: new Date(Number(row._id)).toISOString(),
    cpu: round(row.cpu), cpuMax: round(row.cpuMax), memory: round(row.memory), memoryMax: round(row.memoryMax),
    processCpu: round(row.processCpu), rssMb: round(row.rssMb), heapMb: round(row.heapMb), load1: round(row.load1, 2), samples: row.samples,
  }));
  const times = stamps.map((row: any) => new Date(row.ts).getTime());
  const outages = findOutages(times);
  const avg = (key: 'cpu' | 'memory') => (points.length ? round(points.reduce((sum: number, p: any) => sum + p[key], 0) / points.length) : 0);
  const peak = (key: 'cpuMax' | 'memoryMax') => points.reduce((best: any, p: any) => (!best || p[key] > best[key] ? p : best), null);
  return {
    enabled: true,
    days,
    bucketMinutes: bucketMs / 60000,
    points,
    outages,
    restarts: boots.map((row: any) => new Date(row.ts).toISOString()),
    summary: {
      samples: times.length,
      avgCpu: avg('cpu'), avgMemory: avg('memory'),
      peakCpu: peak('cpuMax') ? { value: peak('cpuMax').cpuMax, at: peak('cpuMax').ts } : null,
      peakMemory: peak('memoryMax') ? { value: peak('memoryMax').memoryMax, at: peak('memoryMax').ts } : null,
      downtimeMinutes: outages.reduce((sum, o) => sum + o.minutes, 0),
    },
  };
};

type HourRow = { hour: number; requests: number; errors: number };

/** The longest run of hours (wrapping past midnight) whose traffic stays under a fifth of the busiest hour. */
const quietWindow = (hours: HourRow[]) => {
  const peak = Math.max(0, ...hours.map((h) => h.requests));
  if (peak === 0) return null;
  const quiet = hours.map((h) => h.requests <= peak * 0.2);
  if (quiet.every(Boolean)) return null;
  let best = { start: 0, length: 0 };
  for (let start = 0; start < 24; start += 1) {
    let length = 0;
    while (length < 24 && quiet[(start + length) % 24]) length += 1;
    if (length > best.length) best = { start, length };
  }
  if (best.length < 2) return null;
  return { from: best.start, to: (best.start + best.length) % 24, hours: best.length };
};

/** Requests per hour of the day (average over the days asked), and over time, from the request logs. */
const getTraffic = async (daysInput?: unknown) => {
  const days = rangeOf(daysInput, [1, 7, 30], 1);
  const db = await getMongoDb();
  if (!db) return { enabled: false, days, series: [], hours: [], summary: null, quietWindow: null };

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const col = db.collection('request_logs');
  const match = { ts: { $gte: since }, path: { $not: /^\/(api\/)?health/ } };
  const stats = {
    requests: { $sum: 1 },
    errors: { $sum: { $cond: [{ $gte: ['$statusCode', 500] }, 1, 0] } },
    slow: { $sum: { $cond: [{ $gte: ['$durationMs', 2500] }, 1, 0] } },
    avgMs: { $avg: '$durationMs' },
  };
  const label = (format: string) => ({ $dateToString: { date: '$ts', format, timezone: TIMEZONE } });
  const [series, byHour, totals] = await Promise.all([
    col.aggregate([{ $match: match }, { $group: { _id: label(days <= 7 ? '%Y-%m-%d %H:00' : '%Y-%m-%d'), ...stats } }, { $sort: { _id: 1 } }]).toArray(),
    col.aggregate([{ $match: match }, { $group: { _id: { $hour: { date: '$ts', timezone: TIMEZONE } }, ...stats } }]).toArray(),
    col.aggregate([{ $match: match }, { $group: { _id: null, ...stats } }]).toArray(),
  ]);

  const hours: Array<HourRow & { total: number; slow: number; avgMs: number }> = Array.from({ length: 24 }, (_, hour) => {
    const row = byHour.find((item: any) => item._id === hour);
    return { hour, requests: round((row?.requests || 0) / days, 1), total: row?.requests || 0, errors: row?.errors || 0, slow: row?.slow || 0, avgMs: round(row?.avgMs || 0, 0) };
  });
  const total = totals[0] || { requests: 0, errors: 0, slow: 0, avgMs: 0 };
  const busiest = hours.reduce((best, h) => (h.requests > best.requests ? h : best), hours[0]);
  return {
    enabled: true,
    days,
    series: series.map((row: any) => ({ label: row._id, requests: row.requests, errors: row.errors, slow: row.slow, avgMs: round(row.avgMs, 0) })),
    hours,
    summary: {
      total: total.requests, errors: total.errors, slow: total.slow, avgMs: round(total.avgMs, 0),
      errorPercent: total.requests ? round((total.errors / total.requests) * 100, 2) : 0,
      busiestHour: total.requests ? busiest.hour : null,
      quietestHour: total.requests ? hours.reduce((best, h) => (h.requests < best.requests ? h : best), hours[0]).hour : null,
    },
    quietWindow: quietWindow(hours),
  };
};

module.exports = { startSampler, stopSampler, takeSample, findOutages, quietWindow, getHistory, getTraffic };
