const isGlobalUser = (user: any) => {
  if (!user || user.userType !== 'superuser') return false;
  return String(user.role || '').toLowerCase() === 'owner';
};

const isCenterAdmin = (user: any) => {
  if (!user || user.userType !== 'superuser') return false;
  return String(user.role || '').toLowerCase() === 'admin';
};

const CENTER_SCOPE_KEYS = [
  'center_id',
  'branch_id',
  'centerId',
  'branchId',
  'x-center-id',
  'x-branch-id',
  'centerid',
  'branchid',
];

const toCenterId = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const firstCenterScopeValue = (...sources: Array<Record<string, any> | undefined | null>) => {
  for (const source of sources) {
    if (!source) continue;
    for (const key of CENTER_SCOPE_KEYS) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
  }
  return null;
};

const getScopedCenterId = (req: any) => {
  if (!req || !req.user) return { centerId: null, isGlobal: false };

  if (isGlobalUser(req.user)) {
    const centerId = toCenterId(firstCenterScopeValue(req.query, req.body, req.params, req.headers));
    return { centerId, isGlobal: centerId == null };
  }

  // Non-global users are scoped strictly by their JWT payload — headers are client-supplied
  // and must never be trusted for tenant scoping.
  const centerId = toCenterId(firstCenterScopeValue(req.user));
  return { centerId, isGlobal: false };
};

const requireCenterId = (res: any, centerId: number | null) => {
  if (!centerId) {
    res.status(403).json({ error: 'Center scope required.' });
    return false;
  }
  return true;
};

module.exports = {
  isGlobalUser,
  isCenterAdmin,
  getScopedCenterId,
  requireCenterId,
};

export {};
