const sessionRepository = require('./repositories/mobileSession.repository');

// @MOB-020 Mobile routes are for the account's own role only. Unlike requireRole, an owner does
// not pass: owner tokens carry no student or parent id to scope the data by.
const requireMobileRole = (...roles: string[]) => (req: any, res: any, next: any): void => {
  if (!req.user || !roles.includes(req.user.userType)) {
    res.status(403).json({ error: "Kirish rad etildi. Bu amalni bajarishga ruxsatingiz yo'q.", code: 'ROLE_FORBIDDEN' });
    return;
  }
  next();
};

// @MOB-023 A signed-out device stops working at once instead of when its access token expires.
// Tokens from the web logins carry no session and are left to their own expiry.
const requireActiveMobileSession = async (req: any, res: any, next: any): Promise<void> => {
  const sessionId = Number(req.user?.sid);
  if (!sessionId) {
    next();
    return;
  }
  try {
    const session = await sessionRepository.findActiveSession(sessionId);
    if (!session || session.user_type !== req.user.userType || Number(session.user_id) !== Number(req.user.id)) {
      res.status(401).json({ error: 'Sessiya tugatilgan. Iltimos, qaytadan tizimga kiring.', code: 'SESSION_REVOKED' });
      return;
    }
    next();
  } catch (error: any) {
    console.error('Mobile session check error:', error);
    res.status(500).json({ error: "Sessiyani tekshirib bo'lmadi" });
  }
};

// @MOB-020 Paging for mobile lists: ?page=1&page_size=20, page_size capped at 100.
const pageParams = (query: any) => {
  const page = Math.max(1, Math.floor(Number(query?.page) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(query?.page_size) || 20)));
  return { page, pageSize, offset: (page - 1) * pageSize };
};

const paged = (rows: any[], page: number, pageSize: number) => {
  const start = (page - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), page, page_size: pageSize, total: rows.length };
};

module.exports = { requireMobileRole, requireActiveMobileSession, pageParams, paged };

export {};
