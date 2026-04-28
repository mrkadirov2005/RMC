const isGlobalUser = (user: any) => {
  if (!user || user.userType !== 'superuser') return false;
  return String(user.role || '').toLowerCase() === 'owner';
};

const isCenterAdmin = (user: any) => {
  if (!user || user.userType !== 'superuser') return false;
  return String(user.role || '').toLowerCase() === 'admin';
};

const getScopedCenterId = (req: any) => {
  if (!req || !req.user) return { centerId: null, isGlobal: false };

  if (isGlobalUser(req.user)) {
    const raw =
      req.query?.branch_id ??
      req.query?.center_id ??
      req.body?.branch_id ??
      req.body?.center_id ??
      req.params?.branch_id ??
      req.params?.center_id;
    const parsed = raw === undefined || raw === null || raw === '' ? null : Number(raw);
    return { centerId: Number.isFinite(parsed) ? parsed : null, isGlobal: parsed == null };
  }

  const centerId = req.user.branch_id ?? req.user.center_id;
  return { centerId: typeof centerId === 'number' ? centerId : null, isGlobal: false };
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
