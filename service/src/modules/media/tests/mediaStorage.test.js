const fs = require('fs');
const os = require('os');
const path = require('path');

describe('media storage (local driver)', () => {
  const env = { ...process.env };
  let storage;
  let dir;
  beforeEach(() => {
    jest.resetModules();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-'));
    process.env.MEDIA_LOCAL_DIR = dir;
    storage = require('../mediaStorage');
  });
  afterEach(() => {
    process.env = { ...env };
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const key = 'homework/student-7/0b2f8a3e-5c1d-4e6f-8a9b-1c2d3e4f5a6b.m4a';
  const queryOf = (url) => Object.fromEntries(new URL(url).searchParams);

  // @MOB-055
  it('signs put and get URLs that only work unchanged and before they expire', async () => {
    const put = await storage.presignPut({ key, contentType: 'audio/mp4', size: 100, expiresSeconds: 60, baseUrl: 'http://api' });
    expect(put.startsWith(`http://api/api/media-local/${key}?op=put`)).toBe(true);
    const q = queryOf(put);
    expect(storage.verifyLocal(key, q)).toEqual({ op: 'put', type: 'audio/mp4', size: 100 });
    expect(storage.verifyLocal(key, { ...q, size: '200' })).toBeNull();
    expect(storage.verifyLocal(key, { ...q, type: 'image/png' })).toBeNull();
    expect(storage.verifyLocal(key.replace('student-7', 'student-8'), q)).toBeNull();
    expect(storage.verifyLocal(key, q, Date.now() + 61_000)).toBeNull();

    const get = queryOf(await storage.presignGet({ key, contentType: 'audio/mp4', expiresSeconds: 60, baseUrl: 'http://api' }));
    expect(storage.verifyLocal(key, get)).toEqual({ op: 'get', type: 'audio/mp4', size: null });
    // A download link cannot be used to upload.
    expect(storage.verifyLocal(key, { ...get, op: 'put' })).toBeNull();
  });

  it('refuses keys outside the server pattern', () => {
    expect(() => storage.localPath('../../etc/passwd')).toThrow('bad media key');
    expect(storage.verifyLocal('../x', { op: 'get' })).toBeNull();
  });

  it('writes, measures and removes files', async () => {
    expect(await storage.sizeOf(key)).toBeNull();
    await storage.writeLocal(key, Buffer.from('hello'));
    expect(await storage.sizeOf(key)).toBe(5);
    expect((await storage.readLocal(key)).toString()).toBe('hello');
    await storage.remove(key);
    expect(await storage.sizeOf(key)).toBeNull();
  });
});
