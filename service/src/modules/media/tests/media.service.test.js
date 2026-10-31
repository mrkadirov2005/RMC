jest.mock('../../../db/pool', () => ({ query: jest.fn() }));
jest.mock('../mediaStorage', () => ({ presignPut: jest.fn(), presignGet: jest.fn(), sizeOf: jest.fn(), remove: jest.fn(), readLocal: jest.fn() }));
jest.mock('../googleDrive', () => ({ isConfigured: jest.fn(() => false), upload: jest.fn() }));

const pool = require('../../../db/pool');
const storage = require('../mediaStorage');
const drive = require('../googleDrive');
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

  // @MOB-055 Owner's decision: files end up in Google Drive with a direct download link.
  describe('Google Drive', () => {
    const row = { media_id: 5, kind: 'audio', content_type: 'audio/mp4', size_bytes: 500, status: 'uploaded', storage_key: 'homework/student-7/0b2f8a3e-5c1d-4e6f-8a9b-1c2d3e4f5a6b.m4a', drive_file_id: null };

    it('moves a checked file to Drive, keeps the link and deletes the backend copy', async () => {
      drive.isConfigured.mockReturnValue(true);
      storage.readLocal.mockResolvedValue(Buffer.from('abc'));
      drive.upload.mockResolvedValue({ id: 'F1', downloadUrl: 'https://drive.google.com/uc?export=download&id=F1' });
      pool.query.mockResolvedValue(rows([]));
      await expect(service.moveToDrive(row)).resolves.toBe(true);
      expect(drive.upload).toHaveBeenCalledWith({ name: 'homework_student-7_0b2f8a3e-5c1d-4e6f-8a9b-1c2d3e4f5a6b.m4a', contentType: 'audio/mp4', data: Buffer.from('abc') });
      expect(pool.query.mock.calls[0][1]).toEqual([5, 'F1', 'https://drive.google.com/uc?export=download&id=F1']);
      expect(storage.remove).toHaveBeenCalledWith(row.storage_key);
    });

    it('keeps the file on the backend when Drive fails or is not configured', async () => {
      drive.isConfigured.mockReturnValue(false);
      await expect(service.moveToDrive(row)).resolves.toBe(false);
      drive.isConfigured.mockReturnValue(true);
      storage.readLocal.mockResolvedValue(Buffer.from('abc'));
      drive.upload.mockRejectedValue(new Error('quota'));
      const log = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(service.moveToDrive(row)).resolves.toBe(false);
      log.mockRestore();
      expect(storage.remove).not.toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('serves the Drive link once the file is there, a signed backend link before', async () => {
      await expect(service.downloadUrl({ ...row, download_url: 'https://drive.google.com/uc?export=download&id=F1' }, 'http://api')).resolves.toMatchObject({
        url: 'https://drive.google.com/uc?export=download&id=F1', expires_in: null,
      });
      expect(storage.presignGet).not.toHaveBeenCalled();
      storage.presignGet.mockResolvedValue('http://api/signed');
      await expect(service.downloadUrl(row, 'http://api')).resolves.toMatchObject({ url: 'http://api/signed', expires_in: 300 });
    });

    it('retries files still on the backend', async () => {
      drive.isConfigured.mockReturnValue(true);
      storage.readLocal.mockResolvedValue(Buffer.from('abc'));
      drive.upload.mockResolvedValue({ id: 'F2', downloadUrl: 'u' });
      pool.query.mockResolvedValueOnce(rows([row, { ...row, media_id: 6 }])).mockResolvedValue(rows([]));
      await expect(service.syncToDrive()).resolves.toBe(2);
      expect(pool.query.mock.calls[0][0]).toMatch(/drive_file_id IS NULL/);
    });
  });
});
