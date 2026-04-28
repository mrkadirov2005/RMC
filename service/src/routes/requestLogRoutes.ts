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

