jest.mock('../../../db/pool', () => ({ query: jest.fn() }));
jest.mock('../mediaStorage', () => ({ presignPut: jest.fn(), presignGet: jest.fn(), sizeOf: jest.fn(), remove: jest.fn() }));

const pool = require('../../../db/pool');
const storage = require('../mediaStorage');
const service = require('../media.service');

const rows = (list) => ({ rows: list });
const owner = { type: 'student', id: 7 };

describe('media service', () => {
  beforeEach(() => jest.clearAllMocks());

  // @MOB-055
  it('refuses unknown purposes, types and sizes over the limit before signing anything', async () => {
    await expect(service.createUpload(owner, { purpose: 'avatar', content_type: 'image/png', size_bytes: 10 }, 'b')).resolves.toEqual({ kind: 'bad_purpose' });
    await expect(service.createUpload(owner, { purpose: 'homework', content_type: 'application/zip', size_bytes: 10 }, 'b')).resolves.toMatchObject({ kind: 'bad_type' });
    await expect(service.createUpload(owner, { purpose: 'homework', content_type: 'audio/mp4', size_bytes: 0 }, 'b')).resolves.toEqual({ kind: 'bad_size' });
    await expect(service.createUpload(owner, { purpose: 'homework', content_type: 'image/jpeg', size_bytes: 11 * 1024 * 1024 }, 'b')).resolves.toEqual({
      kind: 'too_large', max_bytes: 10 * 1024 * 1024,
    });
    expect(storage.presignPut).not.toHaveBeenCalled();
  });

  it('creates a pending row and a signed upload URL', async () => {
    pool.query.mockResolvedValueOnce(rows([{ count: 0 }])).mockResolvedValueOnce(rows([{ media_id: 1, kind: 'audio', content_type: 'audio/mp4', size_bytes: 500, status: 'pending' }]));
    storage.presignPut.mockResolvedValue('https://upload');
    const result = await service.createUpload(owner, { purpose: 'homework', content_type: 'Audio/MP4', size_bytes: 500, file_name: 'a.m4a' }, 'http://api');
    expect(result).toMatchObject({ kind: 'ok', media: { media_id: 1, status: 'pending' }, upload: { url: 'https://upload', method: 'PUT', headers: { 'Content-Type': 'audio/mp4' } } });
    const key = pool.query.mock.calls[1][1][7];
    expect(key).toMatch(/^homework\/student-7\/[0-9a-f-]{36}\.m4a$/);
    expect(storage.presignPut).toHaveBeenCalledWith({ key, contentType: 'audio/mp4', size: 500, expiresSeconds: 900, baseUrl: 'http://api' });
  });

  it('limits uploads per hour', async () => {
    pool.query.mockResolvedValueOnce(rows([{ count: 60 }]));
    await expect(service.createUpload(owner, { purpose: 'homework', content_type: 'audio/mp4', size_bytes: 5 }, 'b')).resolves.toEqual({ kind: 'too_many' });
  });

  it('completes an upload only when the stored file fits, deleting one that does not', async () => {
    const pending = { media_id: 1, kind: 'image', status: 'pending', size_bytes: 100, storage_key: 'k' };
    pool.query.mockResolvedValueOnce(rows([]));
    await expect(service.completeUpload(owner, 1)).resolves.toEqual({ kind: 'not_found' });

    pool.query.mockResolvedValueOnce(rows([pending]));
    storage.sizeOf.mockResolvedValueOnce(null);
    await expect(service.completeUpload(owner, 1)).resolves.toEqual({ kind: 'missing' });

    pool.query.mockResolvedValueOnce(rows([pending])).mockResolvedValueOnce(rows([]));
    storage.sizeOf.mockResolvedValueOnce(101);
    await expect(service.completeUpload(owner, 1)).resolves.toEqual({ kind: 'rejected' });
    expect(storage.remove).toHaveBeenCalledWith('k');

    pool.query.mockResolvedValueOnce(rows([pending])).mockResolvedValueOnce(rows([{ ...pending, status: 'uploaded', size_bytes: 90 }]));
    storage.sizeOf.mockResolvedValueOnce(90);
    await expect(service.completeUpload(owner, 1)).resolves.toMatchObject({ kind: 'ok', media: { status: 'uploaded', size_bytes: 90 } });
  });

  it('gives signed links to the owner only for finished files', async () => {
    pool.query.mockResolvedValueOnce(rows([{ media_id: 1, status: 'pending' }]));
    await expect(service.ownDownload(owner, 1, 'b')).resolves.toBeNull();
    pool.query.mockResolvedValueOnce(rows([{ media_id: 1, status: 'uploaded', storage_key: 'k', content_type: 'audio/mp4', size_bytes: 5 }]));
    storage.presignGet.mockResolvedValue('https://get');
    await expect(service.ownDownload(owner, 1, 'b')).resolves.toMatchObject({ url: 'https://get', expires_in: 300 });
  });

  // @MOB-143
  it('reports media a student does not own or has not finished', async () => {
    await expect(service.invalidOwnMedia(7, [])).resolves.toEqual([]);
    pool.query.mockResolvedValueOnce(rows([{ media_id: 2 }]));
    await expect(service.invalidOwnMedia(7, [2, 3])).resolves.toEqual([3]);
    expect(pool.query.mock.calls[0][1]).toEqual([[2, 3], 7]);
  });
});
