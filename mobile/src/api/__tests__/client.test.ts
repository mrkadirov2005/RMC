import { ApiError, createApiClient, type Tokens } from '../client';

const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response);

const setup = (handler: (url: string, init: RequestInit) => Promise<Response>) => {
  const saved: (Tokens | null)[] = [];
  const fetchFn = jest.fn((url: string, init: RequestInit) => handler(url, init)) as unknown as typeof fetch;
  const client = createApiClient({ baseUrl: 'http://api', fetchFn, saveTokens: async (t) => void saved.push(t) });
  return { client, fetchFn: fetchFn as unknown as jest.Mock, saved };
};

// @MOB-102 Token handling of the app's API client.
describe('api client', () => {
  it('sends the access token and parses JSON', async () => {
    const { client, fetchFn } = setup(() => json(200, { ok: 1 }));
    await client.setTokens({ access_token: 'A', refresh_token: 'R' });

    await expect(client.request('/me')).resolves.toEqual({ ok: 1 });
    expect(fetchFn.mock.calls[0][0]).toBe('http://api/me');
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe('Bearer A');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    let calls = 0;
    const { client, fetchFn, saved } = setup((url, init) => {
      if (url.endsWith('/auth/refresh')) return json(200, { access_token: 'A2', refresh_token: 'R2' });
      calls += 1;
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer A2' ? json(200, { calls }) : json(401, { error: 'expired' });
    });
    await client.setTokens({ access_token: 'A', refresh_token: 'R' });

    await expect(client.request('/me')).resolves.toEqual({ calls: 2 });
    expect(saved.at(-1)).toEqual({ access_token: 'A2', refresh_token: 'R2' });
    expect(fetchFn.mock.calls.filter(([u]) => String(u).endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('shares one refresh between parallel requests', async () => {
    const { client, fetchFn } = setup((url, init) => {
      if (url.endsWith('/auth/refresh')) return json(200, { access_token: 'A2', refresh_token: 'R2' });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer A2' ? json(200, { ok: true }) : json(401, {});
    });
    await client.setTokens({ access_token: 'A', refresh_token: 'R' });

    await Promise.all([client.request('/a'), client.request('/b'), client.request('/c')]);

    expect(fetchFn.mock.calls.filter(([u]) => String(u).endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('signs out when the refresh token is rejected', async () => {
    const onOut = jest.fn();
    const { client, saved } = setup((url) => (url.endsWith('/auth/refresh') ? json(401, { code: 'REFRESH_TOKEN_REUSED' }) : json(401, {})));
    client.setSignedOutHandler(onOut);
    await client.setTokens({ access_token: 'A', refresh_token: 'R' });

    await expect(client.request('/me')).rejects.toMatchObject({ status: 401 });
    expect(onOut).toHaveBeenCalled();
    expect(saved.at(-1)).toBeNull();
    expect(client.getTokens()).toBeNull();
  });

  it('keeps the session when refresh fails for lack of network', async () => {
    const onOut = jest.fn();
    const { client } = setup((url) => (url.endsWith('/auth/refresh') ? Promise.reject(new Error('offline')) : json(401, {})));
    client.setSignedOutHandler(onOut);
    await client.setTokens({ access_token: 'A', refresh_token: 'R' });

    await expect(client.request('/me')).rejects.toBeInstanceOf(ApiError);
    expect(onOut).not.toHaveBeenCalled();
    expect(client.getTokens()).toEqual({ access_token: 'A', refresh_token: 'R' });
  });

  it('reports network failures as status 0 and server errors with their code', async () => {
    const offline = setup(() => Promise.reject(new Error('offline'))).client;
    await expect(offline.request('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });

    const failing = setup(() => json(403, { error: 'no', code: 'CHILD_NOT_LINKED' })).client;
    await expect(failing.request('/x')).rejects.toMatchObject({ status: 403, code: 'CHILD_NOT_LINKED', message: 'no' });
  });
});
