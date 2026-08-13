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
