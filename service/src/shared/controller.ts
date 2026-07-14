const { getScopedCenterId } = require('./tenant');

type ScopeOptions = {
  requireConcreteCenter?: boolean;
};

type ScopeResult =
  | { ok: true; centerId: number | null; isGlobal: boolean; teacherId?: number }
  | { ok: false; status: number; body: Record<string, string> };

const getTeacherScope = (req: any) => (req.user?.userType === 'teacher' ? Number(req.user.id) : undefined);

const getCenterScope = (req: any, options: ScopeOptions = {}): ScopeResult => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  if (!centerId && !isGlobal) {
    return { ok: false, status: 403, body: { error: 'Center scope required.' } };
  }
  if (options.requireConcreteCenter && !centerId && isGlobal) {
    return { ok: false, status: 400, body: { error: 'center_id is required for superuser actions.' } };
  }
  return { ok: true, centerId, isGlobal, teacherId: getTeacherScope(req) };
};

const sendError = (res: any, error: any, message: string, status = 500) => {
  console.error('Database error:', error);
  return res.status(status).json({ error: message, details: error?.message || String(error) });
};

const sendScopeError = (res: any, scope: ScopeResult) => {
  if (scope.ok) return false;
  res.status(scope.status).json(scope.body);
  return true;
};

module.exports = {
  getCenterScope,
  getTeacherScope,
  sendError,
  sendScopeError,
};

export {};
