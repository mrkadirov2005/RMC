const { hashPassword } = require('../../../shared/password');
const superuserRepository = require('../repositories/superuser.repository');
const { isCenterAdmin } = require('../../../shared/tenant');

const listSuperusers = (user?: any) => {
  const centerId = isCenterAdmin(user) ? user?.center_id : undefined;
  return superuserRepository.findAllSafe(centerId);
};

const getSuperuser = (id: number, user?: any) => {
  const centerId = isCenterAdmin(user) ? user?.center_id : undefined;
  return superuserRepository.findById(id, centerId);
};

const createSuperuser = async (body: any, user?: any) => {
  let { center_id, username, email, password, first_name, last_name, role, permissions, status } = body;

  if (isCenterAdmin(user)) {
    center_id = user?.center_id;
  }

  if (!center_id) {
    center_id = await superuserRepository.firstCenterId();
    if (!center_id) return { error: 'no_center' as const };
  }

  const taken = await superuserRepository.countByUsername(username);
  if (taken > 0) return { error: 'username_taken' as const };

  const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Active';
  const password_hash = hashPassword(password);
  const row = await superuserRepository.insert([
    center_id,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role || 'Superuser',
    permissions || {},
    normalizedStatus,
  ]);
  return { row };
};

const updateSuperuser = (id: number, body: any, user?: any) => {
  const { email, first_name, last_name, role, permissions, status } = body;
  const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : null;
  const centerId = isCenterAdmin(user) ? user?.center_id : undefined;
  return superuserRepository.update(id, [email, first_name, last_name, role, permissions, normalizedStatus], centerId);
};

const deleteSuperuser = (id: number, user?: any) => {
  const centerId = isCenterAdmin(user) ? user?.center_id : undefined;
  return superuserRepository.remove(id, centerId);
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
  return { kind: 'ok' as const, superuser };
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
