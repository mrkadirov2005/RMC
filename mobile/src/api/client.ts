import { MOBILE_API } from '../config';

export type Tokens = { access_token: string; refresh_token: string };

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ClientDeps = {
  baseUrl: string;
  fetchFn: typeof fetch;
  saveTokens: (tokens: Tokens | null) => Promise<void>;
};

// @MOB-102 Fetch wrapper: adds the access token, refreshes it once on 401 (one refresh in
// flight at a time, shared by every waiting request), and signs out when refresh fails.
export function createApiClient(deps: ClientDeps) {
  let tokens: Tokens | null = null;
  let refreshing: Promise<boolean> | null = null;
  let onSignedOut: (() => void) | null = null;

  const parse = async (response: Response) => {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  };

  const raw = async (path: string, init: RequestInit = {}, token?: string | null) => {
    const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers as Record<string, string>) };
    if (init.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    let response: Response;
    try {
      response = await deps.fetchFn(`${deps.baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(0, 'NETWORK', 'NETWORK');
    }
    const body = await parse(response);
    if (!response.ok) throw new ApiError(response.status, body?.error || `HTTP ${response.status}`, body?.code);
    return body;
  };

  const setTokens = async (next: Tokens | null) => {
    tokens = next;
    await deps.saveTokens(next);
  };

  const signOutLocally = async () => {
    await setTokens(null);
    onSignedOut?.();
  };

  const refresh = (): Promise<boolean> => {
    if (refreshing) return refreshing;
    const current = tokens?.refresh_token;
    refreshing = (async () => {
      if (!current) return false;
      try {
        const body = await raw('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: current }) });
        await setTokens({ access_token: body.access_token, refresh_token: body.refresh_token });
        return true;
      } catch (error) {
        // A network failure keeps the session so the app can retry later; a rejected token ends it.
        if (error instanceof ApiError && error.status === 401) await signOutLocally();
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  };

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    try {
      return await raw(path, init, tokens?.access_token);
    } catch (error) {
      const expired = error instanceof ApiError && error.status === 401 && error.code !== 'INVALID_CREDENTIALS';
      if (!expired || !tokens?.refresh_token) throw error;
      if (!(await refresh())) throw error;
      return raw(path, init, tokens?.access_token);
    }
  };

  return {
    request,
    refresh,
    raw,
    setTokens,
    signOutLocally,
    getTokens: () => tokens,
    setSignedOutHandler: (handler: (() => void) | null) => {
      onSignedOut = handler;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const TOKENS_KEY = 'ts.session.v1';

// The app-wide client. Tokens are persisted by the auth provider through saveTokens.
let persist: (tokens: Tokens | null) => Promise<void> = async () => {};
export const setTokenPersistence = (fn: (tokens: Tokens | null) => Promise<void>) => {
  persist = fn;
};

export const api = createApiClient({
  baseUrl: MOBILE_API,
  fetchFn: (...args) => fetch(...args),
  saveTokens: (tokens) => persist(tokens),
});
