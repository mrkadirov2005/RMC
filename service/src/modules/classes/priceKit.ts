export {};

// Plumbing for the group price history: database helpers, the signed-in staff member, and a
// controller wrapper that turns { error: 'code' } results into HTTP errors.
const pool = require('../../db/pool');
const { getScopedCenterId } = require('../../shared/tenant');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);
const one = (text: string, params: any[] = []) => query(text, params).then((rows: any[]) => rows[0] || null);

// Runs work on one client inside BEGIN/COMMIT; the callback gets query/one bound to that client.
const tx = async <T>(work: (q: { query: typeof query; one: typeof one }) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  const q = (text: string, params: any[] = []) => client.query(text, params).then((r: any) => r.rows);
  const o = (text: string, params: any[] = []) => q(text, params).then((rows: any[]) => rows[0] || null);
  try {
    await client.query('BEGIN');
    const result = await work({ query: q, one: o });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => null);
    throw error;
  } finally {
    client.release();
  }
};

// The signed-in web panel user (admin, owner or teacher) and the center they work in.
type Actor = { userType: string; id: number; name: string | null; centerId: number | null; isGlobal: boolean; isAdmin: boolean };
const actorOf = (req: any): Actor => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  return {
    userType: req.user.userType,
    id: Number(req.user.id),
    name: req.user.username || req.user.email || null,
    centerId: centerId ?? req.user.center_id ?? null,
    isGlobal: Boolean(isGlobal),
    isAdmin: req.user.userType === 'superuser',
  };
};

const COMMON_ERRORS: Record<string, [number, string]> = {
  not_found: [404, 'Topilmadi'],
  forbidden: [403, "Bu amalni bajarishga ruxsatingiz yo'q."],
  invalid: [400, "Ma'lumotlar noto'g'ri"],
};

const makeController = (label: string, errors: Record<string, [number, string]> = {}) => {
  const all = { ...COMMON_ERRORS, ...errors };
  const fail = (res: any, error: any, message: string) => {
    console.error(`${label} error:`, error);
    res.status(500).json({ error: message });
  };
  // Wraps a handler: a result with { error } becomes that error's status; anything else is sent.
  const handle = (message: string, run: (req: any, res: any) => Promise<any>, status = 200) => async (req: any, res: any) => {
    try {
      const result = await run(req, res);
      if (res.headersSent || result === undefined) return;
      if (result && typeof result === 'object' && typeof result.error === 'string') {
        const [code, text] = all[result.error] || [400, 'Xatolik'];
        return res.status(code).json({ error: text, code: result.error.toUpperCase() });
      }
      res.status(status).json(result);
    } catch (error: any) {
      fail(res, error, message);
    }
  };
  return { handle, fail };
};

// Tashkent is UTC+5 all year.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const tashkentDay = (now = new Date()) => new Date(now.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);

module.exports = { query, one, tx, actorOf, makeController, tashkentDay };
