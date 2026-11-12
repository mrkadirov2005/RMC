jest.mock('../../settings/repositories/settings.repository', () => ({
  getSetting: jest.fn(),
  saveSetting: jest.fn(),
}));

const settingsRepository = require('../../settings/repositories/settings.repository');
const permissions = require('../permissions');

const developer = { userType: 'superuser', role: 'owner', is_developer: true, id: 1 };
const owner = { userType: 'superuser', role: 'owner', id: 2 };
const admin = { userType: 'superuser', role: 'admin', id: 3 };
const teacher = { userType: 'teacher', id: 4 };
const student = { userType: 'student', id: 5 };

describe('developer permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permissions.clearCache();
  });

  test('group prices are open to owners and admins until the developer changes it', async () => {
    settingsRepository.getSetting.mockResolvedValue(null);
    expect(await permissions.allows(owner, 'change_group_price')).toBe(true);
    expect(await permissions.allows(admin, 'change_group_price')).toBe(true);
    expect(await permissions.allows(teacher, 'change_group_price')).toBe(false);
    expect(await permissions.allows(student, 'change_group_price')).toBe(false);
  });

  test('a role turned off is refused; the developer is always allowed', async () => {
    settingsRepository.getSetting.mockResolvedValue({ change_group_price: { owner: false, admin: false } });
    expect(await permissions.allows(owner, 'change_group_price')).toBe(false);
    expect(await permissions.allows(admin, 'change_group_price')).toBe(false);
    expect(await permissions.allows(developer, 'change_group_price')).toBe(true);
  });

  test('a malformed saved value falls back to the default', async () => {
    settingsRepository.getSetting.mockResolvedValue({ change_group_price: { owner: 'no', admin: false } });
    expect(await permissions.getAll()).toEqual({ change_group_price: { owner: true, admin: false } });
  });

  test('update changes only the roles given and saves the whole map', async () => {
    settingsRepository.getSetting.mockResolvedValue({ change_group_price: { owner: true, admin: true } });
    settingsRepository.saveSetting.mockResolvedValue(null);
    const out = await permissions.update('change_group_price', { admin: false });
    expect(out).toEqual({ change_group_price: { owner: true, admin: false } });
    expect(settingsRepository.saveSetting).toHaveBeenCalledWith('developer_permissions', { change_group_price: { owner: true, admin: false } });
  });

  test('only known permission keys are accepted', () => {
    expect(permissions.isPermissionKey('change_group_price')).toBe(true);
    expect(permissions.isPermissionKey('delete_everything')).toBe(false);
  });
});
