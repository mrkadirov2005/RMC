jest.mock('../../../../db/pool', () => ({ query: jest.fn() }));

const pool = require('../../../../db/pool');
const service = require('../mobileRelease.service');

const rows = (list) => ({ rows: list });

describe('mobile release service', () => {
  beforeEach(() => jest.clearAllMocks());

  // @MOB-175
  it('compares versions by number, not as text', () => {
    expect(service.compareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(service.compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(service.compareVersions('0.9.9', '1.0.0')).toBe(-1);
    expect(service.compareVersions('garbage', '0.0.1')).toBe(-1);
  });

  // @MOB-172
  it('turns Google Drive share links into direct download links', () => {
    expect(service.directDownloadUrl('https://drive.google.com/file/d/1AbC-d_9/view?usp=sharing')).toBe('https://drive.usercontent.google.com/download?id=1AbC-d_9&export=download&confirm=t');
    expect(service.directDownloadUrl('https://drive.google.com/open?id=XYZ')).toBe('https://drive.usercontent.google.com/download?id=XYZ&export=download&confirm=t');
    expect(service.directDownloadUrl(' https://example.uz/app.apk ')).toBe('https://example.uz/app.apk');
  });

  it('publishes only a newer version with an https link, keeping the previous minimum by default', async () => {
    pool.query.mockResolvedValue(rows([{ version: '1.1.0', min_version: '1.0.0' }]));
    await expect(service.publish({ version: '1.1', download_url: 'https://x' }, 'a')).resolves.toEqual({ kind: 'bad_version' });
    await expect(service.publish({ version: '1.2.0', download_url: 'http://x' }, 'a')).resolves.toEqual({ kind: 'bad_url' });
    await expect(service.publish({ version: '1.1.0', download_url: 'https://x' }, 'a')).resolves.toEqual({ kind: 'not_newer', current: '1.1.0' });
    await expect(service.publish({ version: '1.2.0', min_version: '1.3.0', download_url: 'https://x' }, 'a')).resolves.toEqual({ kind: 'bad_min_version' });

    pool.query.mockReset();
    pool.query.mockResolvedValueOnce(rows([{ version: '1.1.0', min_version: '1.0.0' }])).mockResolvedValueOnce(rows([{ release_id: 3 }]));
    await expect(service.publish({ version: '1.2.0', download_url: 'https://drive.google.com/file/d/F9/view', notes: 'Fixes' }, 'admin')).resolves.toEqual({
      kind: 'ok', release: { release_id: 3 },
    });
    expect(pool.query.mock.calls[1][1]).toEqual(['1.2.0', '1.0.0', 'https://drive.usercontent.google.com/download?id=F9&export=download&confirm=t', 'Fixes', 'admin']);
  });

  it('the first version is its own minimum', async () => {
    pool.query.mockResolvedValueOnce(rows([])).mockResolvedValueOnce(rows([{ release_id: 1 }]));
    await service.publish({ version: '1.0.0', download_url: 'https://x' }, null);
    expect(pool.query.mock.calls[1][1].slice(0, 2)).toEqual(['1.0.0', '1.0.0']);
  });

  // @MOB-175
  it('app config gives the newest version and the higher of the two minimums', async () => {
    pool.query.mockResolvedValue(rows([{ version: '1.3.0', min_version: '1.2.0', download_url: 'https://d', notes: 'n', created_at: 't' }]));
    await expect(service.appConfig('1.0.0')).resolves.toEqual({
      api_version: 'v1', min_app_version: '1.2.0', latest_version: '1.3.0', download_url: 'https://d', release_notes: 'n', released_at: 't',
    });
    await expect(service.appConfig('1.2.5')).resolves.toMatchObject({ min_app_version: '1.2.5' });
    pool.query.mockResolvedValue(rows([]));
    await expect(service.appConfig('1.0.0')).resolves.toMatchObject({ min_app_version: '1.0.0', latest_version: null, download_url: null });
  });
});
