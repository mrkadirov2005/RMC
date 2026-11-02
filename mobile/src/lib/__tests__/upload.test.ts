import { ApiError } from '../../api/client';
import { uploadFile } from '../upload';

jest.mock('../../config', () => ({ MOBILE_API: 'http://api' }));

const blob = { size: 4000, type: 'audio/mp4' };
const started = { media: { media_id: 1 }, upload: { url: 'https://store/put', method: 'PUT', headers: { 'Content-Type': 'audio/mp4' }, expires_in: 900 } };

const setup = (putResults: (Error | number)[], completeResults: (Error | object)[] = [{ media_id: 1, status: 'uploaded' }]) => {
  const request = jest.fn(async (path: string, _init?: RequestInit) => {
    if (path === '/media/uploads') return started;
    const next = completeResults.shift();
    if (next instanceof Error) throw next;
    return next;
  });
  const fetchFn = jest.fn(async (url: string) => {
    if (url === 'file:///rec.m4a') return { blob: async () => blob };
    const next = putResults.shift();
    if (next instanceof Error) throw next;
    return { ok: next === 200, status: next };
  });
  const wait = jest.fn(async (_ms: number) => {});
  return { deps: { request, fetchFn, wait } as never, request, fetchFn, wait };
};

// @MOB-143 Uploads survive a lost connection.
describe('uploadFile', () => {
  it('asks for a signed URL, uploads the bytes and confirms', async () => {
    const { deps, request, fetchFn } = setup([200]);
    const stages: string[] = [];
    await expect(uploadFile({ uri: 'file:///rec.m4a', contentType: 'audio/mp4', name: 'a.m4a' }, (s) => stages.push(s), deps)).resolves.toEqual({ media_id: 1, status: 'uploaded' });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ purpose: 'homework', content_type: 'audio/mp4', size_bytes: 4000, file_name: 'a.m4a' });
    expect(fetchFn).toHaveBeenLastCalledWith('https://store/put', { method: 'PUT', headers: { 'Content-Type': 'audio/mp4' }, body: blob });
    expect(stages).toEqual(['preparing', 'uploading', 'checking']);
  });

  it('retries the same signed URL after network loss and server errors, with growing pauses', async () => {
    const { deps, request, fetchFn, wait } = setup([new Error('offline'), 503, 200]);
    await uploadFile({ uri: 'file:///rec.m4a', contentType: 'audio/mp4' }, undefined, deps);
    expect(fetchFn.mock.calls.filter(([url]) => url === 'https://store/put')).toHaveLength(3);
    expect(request.mock.calls.filter(([path]) => path === '/media/uploads')).toHaveLength(1);
    expect(wait.mock.calls.map(([ms]) => ms)).toEqual([800, 1600]);
  });

  it('waits for storage to show the file, but stops on a final refusal', async () => {
    const late = setup([200], [new ApiError(409, 'not yet', 'NOT_UPLOADED'), { media_id: 1, status: 'uploaded' }]);
    await expect(uploadFile({ uri: 'file:///rec.m4a', contentType: 'audio/mp4' }, undefined, late.deps)).resolves.toMatchObject({ status: 'uploaded' });

    const tooBig = setup([200], [new ApiError(413, 'Fayl rad etildi', 'REJECTED')]);
    await expect(uploadFile({ uri: 'file:///rec.m4a', contentType: 'audio/mp4' }, undefined, tooBig.deps)).rejects.toThrow('Fayl rad etildi');
    expect(tooBig.wait).not.toHaveBeenCalled();
  });

  it('gives up after the last retry', async () => {
    const { deps, wait } = setup([new Error('x'), new Error('x'), new Error('x'), new Error('x'), new Error('x')]);
    await expect(uploadFile({ uri: 'file:///rec.m4a', contentType: 'audio/mp4' }, undefined, deps)).rejects.toThrow('NETWORK');
    expect(wait).toHaveBeenCalledTimes(4);
  });
});
