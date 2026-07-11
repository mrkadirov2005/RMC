export {};

const express = require('express');
const { getMongoDb } = require('../db/mongo');

const router = express.Router();

function clampInt(value: any, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function optionalNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

router.get('/', async (req: any, res: any) => {
  try {
    const db = await getMongoDb();
    if (!db) {
      res.status(503).json({ error: 'MongoDB is not configured (request logs disabled).' });
      return;
    }

    const kind = String(req.query.kind || '').trim().toLowerCase();
    const q = String(req.query.q || '').trim();
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const skip = clampInt(req.query.skip, 0, 0, 1_000_000);
    const method = String(req.query.method || '').trim().toUpperCase();
    const result = String(req.query.result || '').trim().toLowerCase();
    const statusCode = optionalNumber(req.query.statusCode);
    const statusMin = optionalNumber(req.query.statusMin);
    const statusMax = optionalNumber(req.query.statusMax);
    const durationMin = optionalNumber(req.query.durationMin);
    const durationMax = optionalNumber(req.query.durationMax);
    const username = String(req.query.username || '').trim();
    const ip = String(req.query.ip || '').trim();
    const path = String(req.query.path || '').trim();
    const requestId = String(req.query.requestId || '').trim();
    const role = String(req.query.role || '').trim();
    const deviceId = String(req.query.deviceId || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();

    const filter: any = {};

    if (kind === 'owner') {
      filter.userType = 'superuser';
      filter.role = { $regex: '^owner$', $options: 'i' };
    } else if (kind === 'superuser') {
      filter.userType = 'superuser';
      // Exclude owners from "superuser" tab.
      filter.role = { $ne: 'owner' };
    } else if (kind === 'teacher') {
      filter.userType = 'teacher';
    } else if (kind === 'student') {
      filter.userType = 'student';
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [
        { requestId: rx },
        { method: rx },
        { path: rx },
        { originalUrl: rx },
        { username: rx },
        { ip: rx },
        { userAgent: rx },
        { userType: rx },
        { role: rx },
      ];
    }

    if (method) filter.method = method;

    if (result === 'success') {
      filter.success = true;
      filter.aborted = { $ne: true };
    } else if (result === 'failed') {
      filter.success = false;
      filter.aborted = { $ne: true };
    } else if (result === 'aborted') {
      filter.aborted = true;
    }

    if (statusCode !== undefined) {
      filter.statusCode = statusCode;
    } else {
      const statusRange: any = {};
      if (statusMin !== undefined) statusRange.$gte = statusMin;
      if (statusMax !== undefined) statusRange.$lte = statusMax;
      if (Object.keys(statusRange).length) filter.statusCode = statusRange;
    }

    const durationRange: any = {};
    if (durationMin !== undefined) durationRange.$gte = durationMin;
    if (durationMax !== undefined) durationRange.$lte = durationMax;
    if (Object.keys(durationRange).length) filter.durationMs = durationRange;

    if (username) filter.username = { $regex: escapeRegex(username), $options: 'i' };
    if (ip) filter.ip = { $regex: escapeRegex(ip), $options: 'i' };
    if (path) {
      const rx = new RegExp(escapeRegex(path), 'i');
      filter.$and = [...(filter.$and || []), { $or: [{ path: rx }, { originalUrl: rx }] }];
    }
    if (requestId) filter.requestId = { $regex: escapeRegex(requestId), $options: 'i' };
    if (role) filter.$and = [...(filter.$and || []), { role: { $regex: escapeRegex(role), $options: 'i' } }];
    if (deviceId) filter.deviceId = { $regex: escapeRegex(deviceId), $options: 'i' };

    const tsRange: any = {};
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) tsRange.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) tsRange.$lte = toDate;
    }
    if (Object.keys(tsRange).length) filter.ts = tsRange;

    const col = db.collection('request_logs');
    const total = await col.countDocuments(filter);
    const items = await col
      .find(filter, {
        projection: {
          ts: 1,
          requestId: 1,
          method: 1,
          originalUrl: 1,
          path: 1,
          statusCode: 1,
          success: 1,
          aborted: 1,
          durationMs: 1,
          ip: 1,
          userAgent: 1,
          deviceId: 1,
          userId: 1,
          username: 1,
          userType: 1,
          role: 1,
          failureReason: 1,
          failureDetails: 1,
        },
      })
      .sort({ ts: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({ total, limit, skip, items });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch request logs', details: err?.message || String(err) });
  }
});

module.exports = router;
