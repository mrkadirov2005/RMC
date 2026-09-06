jest.mock('../../repositories/settings.repository', () => ({ getSetting: jest.fn(), saveSetting: jest.fn() }));
const repository = require('../../repositories/settings.repository');
const service = require('../settings.service');

describe('settings service', () => {
  beforeEach(() => jest.clearAllMocks());
  test('normalizes scores, fill, tone, symbols, bonus, and descending coin mapping', () => {
    const value = service.normalizeLessonScoring({
      attendance: [{ label: 'Good', score: '12', fill: 150, symbol: 'LONGER', tone: 'invalid' }],
      stellarBonusCoins: '7.6', coinScoreMapping: [{ score: 40, coins: 2.4 }, { score: 120, coins: 5.8 }],
    });
    expect(value.attendance[0]).toMatchObject({ label: 'Good', score: 12, fill: 100, symbol: 'LONG' });
    expect(value.stellarBonusCoins).toBe(8);
    expect(value.coinScoreMapping).toEqual([{ score: 100, coins: 6 }, { score: 40, coins: 2 }]);
  });
  test('loads defaults when no center setting exists and saves normalized values', async () => {
    repository.getSetting.mockResolvedValue(null);
    const loaded = await service.getLessonScoring(2);
    expect(loaded.attendance.length).toBeGreaterThan(0);
    await service.saveLessonScoring({ stellarBonusCoins: 4 }, 2);
    expect(repository.saveSetting).toHaveBeenCalledWith('lesson_scoring', expect.objectContaining({ stellarBonusCoins: 4 }), 2);
  });
  test('filters sidebar values, removes duplicates, and caps stored routes', async () => {
    repository.getSetting.mockResolvedValue(['/a', 2, '/b']);
    await expect(service.getSidebarOrder('teacher', 4)).resolves.toEqual(['/a', '/b']);
    await service.saveSidebarOrder('teacher', 4, ['/a', '/a', 'invalid', '/b']);
    expect(repository.saveSetting).toHaveBeenCalledWith('sidebar_order:teacher:4', ['/a', '/b']);
  });

  // RMC-013 (confirmed correct, not a role gate): sidebar order is keyed per user via
  // `sidebar_order:${userType}:${userId}`, so it isolates by both userType and userId. These
  // tests prove two different users (and two different user types sharing the same numeric id)
  // read and write entirely separate keys and can never see each other's saved order.
  describe('sidebar order is isolated per user (RMC-013)', () => {
    test('reads a different repository key for a different userId of the same userType', async () => {
      repository.getSetting.mockResolvedValue(['/a']);
      await service.getSidebarOrder('teacher', 4);
      await service.getSidebarOrder('teacher', 9);
      expect(repository.getSetting).toHaveBeenNthCalledWith(1, 'sidebar_order:teacher:4');
      expect(repository.getSetting).toHaveBeenNthCalledWith(2, 'sidebar_order:teacher:9');
    });

    test('reads a different repository key for the same numeric id under a different userType', async () => {
      repository.getSetting.mockResolvedValue(['/a']);
      await service.getSidebarOrder('teacher', 4);
      await service.getSidebarOrder('superuser', 4);
      expect(repository.getSetting).toHaveBeenNthCalledWith(1, 'sidebar_order:teacher:4');
      expect(repository.getSetting).toHaveBeenNthCalledWith(2, 'sidebar_order:superuser:4');
    });

    test('saving one user order never writes to another user key', async () => {
      await service.saveSidebarOrder('teacher', 4, ['/dashboard']);
      await service.saveSidebarOrder('teacher', 9, ['/reports']);
      expect(repository.saveSetting).toHaveBeenNthCalledWith(1, 'sidebar_order:teacher:4', ['/dashboard']);
      expect(repository.saveSetting).toHaveBeenNthCalledWith(2, 'sidebar_order:teacher:9', ['/reports']);
      // Neither call touches the other user's key.
      expect(repository.saveSetting).not.toHaveBeenCalledWith('sidebar_order:teacher:4', ['/reports']);
      expect(repository.saveSetting).not.toHaveBeenCalledWith('sidebar_order:teacher:9', ['/dashboard']);
    });
  });
  test('loads and saves a normalized center-wide owner palette', async () => {
    repository.getSetting.mockResolvedValue('sunset');
    await expect(service.getOwnerPalette(3)).resolves.toMatchObject({ id: 'sunset', primary: '#ff5a00' });
    await service.saveOwnerPalette({ id: 'custom', primary: '#112233', secondary: '#445566', tertiary: '#fefefe' }, 3);
    expect(repository.saveSetting).toHaveBeenCalledWith('owner_panel_palette', { id: 'custom', primary: '#112233', secondary: '#445566', tertiary: '#fefefe' }, 3);
    expect(service.normalizeOwnerPalette('unknown')).toMatchObject({ id: 'ocean' });
  });
  test('keeps only safe exact-card color and typography overrides', () => {
    expect(service.normalizeVisualOverrides([
      { key: '/students/1|card|profile', color: '#AABBCC', textColor: '#112233', fontSize: 18.4, fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline' },
      { key: 'bad', color: 'red', textColor: 'white', fontSize: 100, fontWeight: '900' },
    ])).toEqual([{
      key: '/students/1|card|profile', color: '#aabbcc', textColor: '#112233', fontSize: 18,
      fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline',
    }]);
  });
});
