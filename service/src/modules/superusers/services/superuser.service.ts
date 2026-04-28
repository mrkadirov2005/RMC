const { hashPassword } = require('../../../shared/password');
const superuserRepository = require('../repositories/superuser.repository');

const normalizeBranchId = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizePermissions = (value: any): string[] => {
  if (Array.isArray(value)) return value.map((permission) => String(permission)).filter(Boolean);
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([permission]) => permission);
  }
  return [];
};

const permissionsForStorage = (value: any) => JSON.stringify(normalizePermissions(value));

const withBranchId = (row: any) => {
  if (!row) return null;
  return {
    ...row,
    branch_id: normalizeBranchId(row.branch_id ?? row.center_id) ?? row.center_id,
    permissions: normalizePermissions(row.permissions),
  };
};

const listSuperusers = async (centerId?: number | null) => {
  const rows = await superuserRepository.findAllSafe(normalizeBranchId(centerId) ?? undefined);
  return rows.map(withBranchId);
};

const getSuperuser = async (id: number, centerId?: number | null) => {
  const row = await superuserRepository.findById(id, normalizeBranchId(centerId) ?? undefined);
  return withBranchId(row);
};

const createSuperuser = async (body: any, user?: any, centerId?: number | null) => {
  let { branch_id, center_id, username, email, password, first_name, last_name, role, permissions, status } = body;
  const requestedBranchId = normalizeBranchId(branch_id ?? center_id);
  const scopedBranchId = normalizeBranchId(centerId);

  const effectiveBranchId = requestedBranchId ?? scopedBranchId;

  if (!effectiveBranchId) {
    return { error: 'branch_required' as const };
  }

  const taken = await superuserRepository.countByUsername(username);
  if (taken > 0) return { error: 'username_taken' as const };

  const normalizedRole = String(role || 'admin').toLowerCase();
  const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Active';
  const password_hash = hashPassword(password);
  const row = await superuserRepository.insert([
    effectiveBranchId,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    normalizedRole,
    permissionsForStorage(permissions),
    normalizedStatus,
  ]);
  return { row: withBranchId(row) };
};

const updateSuperuser = async (id: number, body: any, centerId?: number | null) => {
  const { email, first_name, last_name, role, permissions, status } = body;
  const normalizedRole = role ? String(role).toLowerCase() : null;
  const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : null;
  const row = await superuserRepository.update(
    id,
    [email, first_name, last_name, normalizedRole, permissionsForStorage(permissions), normalizedStatus],
    normalizeBranchId(centerId) ?? undefined
  );
  return withBranchId(row);
};

const deleteSuperuser = async (id: number, centerId?: number | null) => {
  const row = await superuserRepository.remove(id, normalizeBranchId(centerId) ?? undefined);
  return withBranchId(row);
};

const authenticate = async (username: string, password: string) => {
  const superuser = await superuserRepository.findByUsernameForLogin(username);
  if (!superuser) return { kind: 'invalid' as const };
  if (superuser.is_locked) return { kind: 'locked' as const };
  if (superuser.status !== 'Active') return { kind: 'inactive' as const };
  if (hashPassword(password) !== superuser.password_hash) {
    await superuserRepository.incrementLoginAttempts(superuser.superuser_id);
    return { kind: 'invalid' as const };
  }
  await superuserRepository.resetLoginSuccess(superuser.superuser_id);
  return { kind: 'ok' as const, superuser: withBranchId(superuser) };
};

const changePassword = async (id: number, old_password: string, new_password: string) => {
  const existing = await superuserRepository.findPasswordHash(id);
  if (existing === undefined) return { ok: false as const, reason: 'not_found' as const };
  if (hashPassword(old_password) !== existing) return { ok: false as const, reason: 'bad_old' as const };
  await superuserRepository.updatePasswordHash(id, hashPassword(new_password));
  return { ok: true as const };
};

module.exports = {
  listSuperusers,
  getSuperuser,
  createSuperuser,
  updateSuperuser,
  deleteSuperuser,
  authenticate,
  changePassword,
};

export {};
