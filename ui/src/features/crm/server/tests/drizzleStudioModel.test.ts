import { describe, expect, it, vi } from 'vitest';
import { DRIZZLE_STUDIO_SERVER_URL, probeDrizzleStudio } from '../drizzleStudioModel';

const respond = (ok: boolean, body: unknown) => vi.fn().mockResolvedValue({ ok, json: async () => body });

describe('probeDrizzleStudio', () => {
  it('sends the Studio init request to the tunnelled localhost port', async () => {
    const fetcher = respond(true, { dialect: 'postgresql' });
    await expect(probeDrizzleStudio(fetcher as unknown as typeof fetch)).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith(DRIZZLE_STUDIO_SERVER_URL, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ type: 'init' }),
    }));
  });

  it('reports offline when nothing answers, the answer fails, or it is not Studio', async () => {
    const refused = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(probeDrizzleStudio(refused as unknown as typeof fetch)).resolves.toBe(false);
    await expect(probeDrizzleStudio(respond(false, {}) as unknown as typeof fetch)).resolves.toBe(false);
    await expect(probeDrizzleStudio(respond(true, { hello: 'world' }) as unknown as typeof fetch)).resolves.toBe(false);
  });

  it('gives up when the request hangs', async () => {
    const hanging = vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    await expect(probeDrizzleStudio(hanging as unknown as typeof fetch, 10)).resolves.toBe(false);
  });
});
