export {};

// Permissions the developer turns on and off for owners and admins from the Technical section.
// The developer account itself is always allowed. Stored as one global app_settings row.
const settingsRepository = require('../settings/repositories/settings.repository');

const SETTING_KEY = 'developer_permissions';
const CACHE_MS = 10_000;

export type PermissionKey = 'change_group_price';
export type PermissionRole = 'owner' | 'admin';
type RoleSwitches = Record<PermissionRole, boolean>;
type PermissionMap = Record<PermissionKey, RoleSwitches>;

// What a permission is before the developer has changed it.
const DEFAULTS: PermissionMap = {
  change_group_price: { owner: true, admin: true },
};

const PERMISSION_KEYS = Object.keys(DEFAULTS) as PermissionKey[];
const ROLES: PermissionRole[] = ['owner', 'admin'];

let cache: { at: number; value: PermissionMap } | null = null;

const isPermissionKey = (value: unknown): value is PermissionKey => PERMISSION_KEYS.includes(value as PermissionKey);

// Saved values over the defaults; anything missing or malformed falls back to its default.
const merge = (saved: any): PermissionMap => {
  const out = {} as PermissionMap;
  for (const key of PERMISSION_KEYS) {
    out[key] = { ...DEFAULTS[key] };
    for (const role of ROLES) {
      if (typeof saved?.[key]?.[role] === 'boolean') out[key][role] = saved[key][role];
    }
  }
  return out;
};

const getAll = async (): Promise<PermissionMap> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = merge(await settingsRepository.getSetting(SETTING_KEY));
  cache = { at: Date.now(), value };
  return value;
};

const update = async (key: PermissionKey, roles: Partial<RoleSwitches>): Promise<PermissionMap> => {
  const current = merge(await settingsRepository.getSetting(SETTING_KEY));
  for (const role of ROLES) {
    if (typeof roles?.[role] === 'boolean') current[key][role] = roles[role] as boolean;
  }
  await settingsRepository.saveSetting(SETTING_KEY, current);
  cache = null;
  return current;
};

const isDeveloper = (user: any) => Boolean(user && user.userType === 'superuser' && user.is_developer === true);

// Owners sign in as superusers with the owner role; every other superuser is an admin.
const roleOf = (user: any): PermissionRole | null => {
  if (user?.userType !== 'superuser') return null;
  return String(user.role || '').toLowerCase() === 'owner' ? 'owner' : 'admin';
};

const allows = async (user: any, key: PermissionKey): Promise<boolean> => {
  if (isDeveloper(user)) return true;
  const role = roleOf(user);
  if (!role) return false;
  return (await getAll())[key][role];
};

const clearCache = () => {
  cache = null;
};

module.exports = { getAll, update, allows, isPermissionKey, clearCache, DEFAULTS };
