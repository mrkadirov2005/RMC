const { hashPassword } = require('../../../shared/password');
const ownerRepository = require('../repositories/owner.repository');
import type {
  CreateOwnerDto,
  RegisterOwnerDto,
  UpdateOwnerDto,
} from '../dtos/owner.dto';

const listOwners = () => ownerRepository.findAllSafe();

const getOwner = (id: number) => ownerRepository.findById(id);

const createOwner = async (body: CreateOwnerDto) => {
  const { username, email, password, first_name, last_name, status } = body;
  const taken = await ownerRepository.countByUsername(username);
  if (taken > 0) return { error: 'username_taken' as const };

  const row = await ownerRepository.insert([
    username,
    email,
    hashPassword(password),
    first_name,
    last_name,
    status || 'Active',
  ]);

  return { row };
};

const registerOwner = async (body: RegisterOwnerDto) => {
  const { username, email, password, first_name, last_name } = body;
  const taken = await ownerRepository.countByUsername(username);
  if (taken > 0) return { error: 'username_taken' as const };

  const row = await ownerRepository.insert([
    username,
    email,
    hashPassword(password),
    first_name,
    last_name,
    'Active',
  ]);

  return { row };
};

const updateOwner = async (id: number, body: UpdateOwnerDto) => {
  const { email, first_name, last_name, status, password } = body;
  const passwordHash = password ? hashPassword(password) : null;
  return ownerRepository.update(id, [email, first_name, last_name, status || null, passwordHash]);
};

const deleteOwner = (id: number) => ownerRepository.remove(id);

const authenticate = async (username: string, password: string) => {
  const owner = await ownerRepository.findByUsernameForLogin(username);
  if (!owner) return { kind: 'invalid' as const };
  if (owner.is_locked) return { kind: 'locked' as const };
  if (owner.status !== 'Active') return { kind: 'inactive' as const };
  if (hashPassword(password) !== owner.password_hash) {
    await ownerRepository.incrementLoginAttempts(owner.owner_id);
    return { kind: 'invalid' as const };
  }
  await ownerRepository.resetLoginSuccess(owner.owner_id);
  return { kind: 'ok' as const, owner };
};

const changePassword = async (id: number, old_password: string, new_password: string) => {
  const existing = await ownerRepository.findPasswordHash(id);
  if (existing === undefined) return { ok: false as const, reason: 'not_found' as const };
  if (hashPassword(old_password) !== existing) return { ok: false as const, reason: 'bad_old' as const };
  await ownerRepository.updatePasswordHash(id, hashPassword(new_password));
  return { ok: true as const };
};

module.exports = {
  listOwners,
  getOwner,
  createOwner,
  registerOwner,
  updateOwner,
  deleteOwner,
  authenticate,
  changePassword,
};

export {};
