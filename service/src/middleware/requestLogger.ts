export {};

const crypto = require('crypto');
const { getMongoDb } = require('../db/mongo');

function firstHeaderValue(v: any): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return String(v[0] ?? '').trim() || null;
  return String(v).trim() || null;
}

function getClientIp(req: any): string | null {
  // Prefer explicit proxy headers when present. We don't depend on `trust proxy` here.
  const xff = firstHeaderValue(req.headers['x-forwarded-for']);
  if (xff) return xff.split(',')[0].trim();

  const xRealIp = firstHeaderValue(req.headers['x-real-ip']);
  if (xRealIp) return xRealIp;

  const cfIp = firstHeaderValue(req.headers['cf-connecting-ip']);
  if (cfIp) return cfIp;

  return (
    firstHeaderValue(req.ip) ||
    firstHeaderValue(req.socket?.remoteAddress) ||
    firstHeaderValue(req.connection?.remoteAddress) ||
    null
  );
}

function getRequestId(req: any): string {
  const incoming = firstHeaderValue(req.headers['x-request-id']);
  if (incoming) return incoming;
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

function getDeviceId(req: any): string | null {
  return (
    firstHeaderValue(req.headers['x-device-id']) ||
    firstHeaderValue(req.headers['x-client-id']) ||
    null
  );
}

function getUsernameBestEffort(req: any): string | null {
  const fromUser = firstHeaderValue(req.user?.username) || firstHeaderValue(req.user?.email);
  if (fromUser) return fromUser;

  // For login routes (no req.user yet), capture the attempted username/email.
  const fromBody = firstHeaderValue(req.body?.username) || firstHeaderValue(req.body?.email) || firstHeaderValue(req.body?.login);
  return fromBody || null;
}

function safePath(req: any): string {
  // Express ensures these exist; fall back defensively.
  return String(req.path || req.url || '');
}

function safeOriginalUrl(req: any): string {
  return String(req.originalUrl || req.url || '');
}

function safeJson(value: any, maxLength = 1200): string | null {
  if (value == null) return null;
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  } catch {
    return null;
  }
}

function extractFailureInfo(payload: any) {
  if (payload == null) return null;
  if (typeof payload === 'string') {
    return { failureReason: payload.slice(0, 240), failureDetails: null };
  }

  const reason =
    firstHeaderValue(payload.error) ||
    firstHeaderValue(payload.message) ||
    firstHeaderValue(payload.reason) ||
    firstHeaderValue(payload.code) ||
    null;

  const details =
    payload.details != null ? payload.details :
    payload.errors != null ? payload.errors :
    payload.detail != null ? payload.detail :
    null;

  return {
    failureReason: reason ? reason.slice(0, 240) : null,
    failureDetails: safeJson(details),
  };
}

function requestLogger(req: any, res: any, next: any): void {
  const startedAt = Date.now();
  const requestId = getRequestId(req);

  // Propagate for easier cross-service debugging.
  try {
    res.setHeader('x-request-id', requestId);
  } catch {
    // ignore
  }

  let logged = false;

  const captureFailurePayload = (payload: any) => {
    const statusCode = Number(res.statusCode || 0);
    if (statusCode < 400) return;
    const info = extractFailureInfo(payload);
    if (!info) return;
    res.locals.requestLogFailure = {
      failureReason: info.failureReason || res.locals.requestLogFailure?.failureReason || null,
      failureDetails: info.failureDetails || res.locals.requestLogFailure?.failureDetails || null,
    };
  };

  const originalJson = res.json.bind(res);
  res.json = (payload: any) => {
    captureFailurePayload(payload);
    return originalJson(payload);
  };

  const originalSend = res.send.bind(res);
  res.send = (payload: any) => {
    captureFailurePayload(payload);
    return originalSend(payload);
  };

  const writeLog = async (aborted: boolean) => {
    if (logged) return;
    logged = true;

    try {
      const db = await getMongoDb();
      if (!db) return;

      const durationMs = Date.now() - startedAt;
      const statusCode = Number(res.statusCode || 0);
      const success = !aborted && statusCode > 0 && statusCode < 400;

      const userId = req.user?.id ?? null;
      const userType = req.user?.userType ?? null;
      const role = req.user?.role ?? null;
      const username = getUsernameBestEffort(req);
      const failure = res.locals.requestLogFailure || {};

      const doc = {
        ts: new Date(),
        requestId,
        method: String(req.method || '').toUpperCase(),
        originalUrl: safeOriginalUrl(req),
        path: safePath(req),
        statusCode,
        success,
        aborted,
        durationMs,
        ip: getClientIp(req),
        userAgent: firstHeaderValue(req.headers['user-agent']),
        deviceId: getDeviceId(req),
        userId,
        username,
        userType,
        role,
        failureReason: success ? null : failure.failureReason || null,
        failureDetails: success ? null : failure.failureDetails || null,
      };

      // Fire-and-forget insert; logging should never block the response lifecycle.
      db.collection('request_logs').insertOne(doc).catch(() => {});
    } catch {
      // Never let logging break the API.
    }
  };

  res.on('finish', () => {
    void writeLog(false);
  });

  res.on('close', () => {
    // If the connection closed before the response finished, record as aborted.
    if (res.writableEnded) return;
    void writeLog(true);
  });

  next();
}

module.exports = {
  requestLogger,
};
