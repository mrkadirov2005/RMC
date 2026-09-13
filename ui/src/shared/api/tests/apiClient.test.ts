import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosStub, client, toast, handleApiError, storeStub, scope, auth } = vi.hoisted(() => {
  const requestHandlers: any[] = [];
  const responseHandlers: any[] = [];
  const clientStub: any = {
    get: vi.fn(() => Promise.resolve({ data: null })),
    post: vi.fn(() => Promise.resolve({ data: null })),
    put: vi.fn(() => Promise.resolve({ data: null })),
    patch: vi.fn(() => Promise.resolve({ data: null })),
    delete: vi.fn(() => Promise.resolve({ data: null })),
    interceptors: {
      request: { use: vi.fn((onFulfilled: any) => requestHandlers.push(onFulfilled)) },
      response: {
        use: vi.fn((onFulfilled: any, onRejected: any) => responseHandlers.push({ onFulfilled, onRejected })),
      },
    },
    requestHandlers,
    responseHandlers,
  };
  return {
    axiosStub: { default: { create: vi.fn(() => clientStub) } },
    client: clientStub,
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
    handleApiError: vi.fn(() => ''),
    storeStub: { dispatch: vi.fn(), getState: vi.fn(() => ({})) },
    scope: {
      getCenterScopeHeaders: vi.fn(() => ({ 'x-center-id': '3' })),
      isGlobalSuperuser: vi.fn(() => false),
      withCenterScopeParams: vi.fn((params: any) => ({ ...params, center_id: 3 })),
      withCenterScopePayload: vi.fn((payload: any) => ({ ...payload, center_id: 3 })),
    },
    auth: { getStoredAuth: vi.fn(() => ({ token: null, user: null })) },
  };
});

vi.mock('axios', () => axiosStub);
vi.mock('../../../utils/toast', () => ({ showToast: toast, handleApiError }));
vi.mock('../../../store', () => ({ store: storeStub }));
vi.mock('../../auth/centerScope', () => scope);
vi.mock('../../auth/authStorage', () => auth);
vi.mock('../../../slices/serviceStatusSlice', () => ({
  setBackendUnreachable: vi.fn(() => ({ type: 'serviceStatus/backendUnreachable' })),
  setHealthy: vi.fn(() => ({ type: 'serviceStatus/healthy' })),
  setOffline: vi.fn(() => ({ type: 'serviceStatus/offline' })),
}));
vi.mock('../../../slices/paymentAccessSlice', () => ({
  paymentLogout: vi.fn(() => ({ type: 'paymentAccess/logout' })),
}));

import * as api from '../api';

const onRequest = () => client.requestHandlers[0];
const onResponse = () => client.responseHandlers[0].onFulfilled;
const onResponseError = () => client.responseHandlers[0].onRejected;

const setUser = (user: any, token: string | null = 'jwt') => {
  auth.getStoredAuth.mockReturnValue({ token, user });
  localStorage.setItem('user', JSON.stringify(user));
};

describe('API base URL', () => {
  it('drops any trailing slashes from the configured base', () => {
    expect(api.API_BASE_URL.endsWith('/')).toBe(false);
  });

  it('joins a path onto the base without doubling the separator', () => {
    expect(api.buildApiUrl('/students')).toBe(`${api.API_BASE_URL}/students`);
    expect(api.buildApiUrl('students')).toBe(`${api.API_BASE_URL}/students`);
  });
});

describe('request interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    scope.isGlobalSuperuser.mockReturnValue(false);
    scope.getCenterScopeHeaders.mockReturnValue({ 'x-center-id': '3' });
    auth.getStoredAuth.mockReturnValue({ token: null, user: null });
  });

  it('stamps a device id and remembers it for later requests', () => {
    const first = onRequest()({ url: '/students', headers: {} });
    const second = onRequest()({ url: '/students', headers: {} });

    expect(first.headers['x-device-id']).toBeTruthy();
    expect(second.headers['x-device-id']).toBe(first.headers['x-device-id']);
  });

  it('keeps a device id the caller already set', () => {
    const config = onRequest()({ url: '/students', headers: { 'x-device-id': 'caller-supplied' } });

    expect(config.headers['x-device-id']).toBe('caller-supplied');
  });

  it('attaches the stored token as a bearer credential', () => {
    setUser({ userType: 'superuser' }, 'jwt-token');

    const config = onRequest()({ url: '/students', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer jwt-token');
  });

  it('sends no credential when the browser has none stored', () => {
    const config = onRequest()({ url: '/students', headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('uses the separate payment credential for a teacher reading payments', () => {
    setUser({ userType: 'teacher' }, 'jwt-token');
    localStorage.setItem('payment_token', 'payment-jwt');

    const config = onRequest()({ url: '/payments', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer payment-jwt');
    expect(scope.getCenterScopeHeaders).not.toHaveBeenCalled();
  });

  it('leaves an administrator on the ordinary credential for payments', () => {
    setUser({ userType: 'superuser' }, 'jwt-token');
    localStorage.setItem('payment_token', 'payment-jwt');

    const config = onRequest()({ url: '/payments', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer jwt-token');
  });

  it('adds the center scope headers to an ordinary request', () => {
    const config = onRequest()({ url: '/students', headers: {} });

    expect(config.headers['x-center-id']).toBe('3');
  });

  it('leaves owner administration outside the center scope', () => {
    const config = onRequest()({ url: '/owners/1', headers: {} });

    expect(scope.getCenterScopeHeaders).not.toHaveBeenCalled();
    expect(config.headers['x-center-id']).toBeUndefined();
  });

  it('honours an explicit request to skip the center scope', () => {
    const config = onRequest()({ url: '/centers/summaries', headers: { 'X-Skip-Center-Scope': '1' } });

    expect(scope.getCenterScopeHeaders).not.toHaveBeenCalled();
    expect(config.headers['x-center-id']).toBeUndefined();
  });

  it.each(['get', 'delete'])('adds the center to the query string of a %s for a global superuser', (method) => {
    scope.isGlobalSuperuser.mockReturnValue(true);

    const config = onRequest()({ url: '/students', method, headers: {}, params: { page: 2 } });

    expect(config.params).toEqual({ page: 2, center_id: 3 });
  });

  it('tolerates a read that carries no query string', () => {
    scope.isGlobalSuperuser.mockReturnValue(true);

    const config = onRequest()({ url: '/students', method: 'get', headers: {} });

    expect(config.params).toEqual({ center_id: 3 });
  });

  it.each(['post', 'put', 'patch'])('adds the center to the body of a %s', (method) => {
    const config = onRequest()({ url: '/students', method, headers: {}, data: { first_name: 'Ada' } });

    expect(config.data).toEqual({ first_name: 'Ada', center_id: 3 });
  });

  it('leaves a file upload body untouched', () => {
    const body = new FormData();

    const config = onRequest()({ url: '/students', method: 'post', headers: {}, data: body });

    expect(config.data).toBe(body);
    expect(scope.withCenterScopePayload).not.toHaveBeenCalled();
  });

  it('leaves an owner write outside the center scope', () => {
    const config = onRequest()({ url: '/owners', method: 'post', headers: {}, data: { username: 'ada' } });

    expect(config.data).toEqual({ username: 'ada' });
  });
});

describe('response interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    handleApiError.mockReturnValue('');
  });

  it.each(['post', 'put', 'delete'])('announces a successful %s', (method) => {
    onResponse()({ config: { method }, data: { message: 'Saved' } });

    expect(toast.success).toHaveBeenCalledWith('Saved');
  });

  it('falls back to a generic confirmation when the server sends no message', () => {
    onResponse()({ config: { method: 'post' }, data: {} });

    expect(toast.success).toHaveBeenCalledWith('Operation successful!');
  });

  it('says nothing about a successful read', () => {
    onResponse()({ config: { method: 'get' }, data: {} });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('marks the backend healthy after any successful call', () => {
    onResponse()({ config: { method: 'get' }, data: {} });

    expect(storeStub.dispatch).toHaveBeenCalledWith({ type: 'serviceStatus/healthy' });
  });

  it('records the browser as offline when a request never reached the server', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    await expect(onResponseError()({ config: { url: '/students' } })).rejects.toBeDefined();

    expect(storeStub.dispatch).toHaveBeenCalledWith({ type: 'serviceStatus/offline' });
  });

  it('records the backend as unreachable when the browser is online', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    await expect(onResponseError()({ config: { url: '/students' } })).rejects.toBeDefined();

    expect(storeStub.dispatch).toHaveBeenCalledWith({ type: 'serviceStatus/backendUnreachable' });
  });

  it('lets a failed login surface without clearing the session', async () => {
    localStorage.setItem('token', 'jwt');

    await expect(onResponseError()({
      response: { status: 401 },
      config: { url: '/superusers/auth/login' },
    })).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBe('jwt');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('drops only the payment credential when payment access expires', async () => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('payment_token', 'payment-jwt');
    localStorage.setItem('user', JSON.stringify({ userType: 'teacher' }));

    await expect(onResponseError()({ response: { status: 401 }, config: { url: '/payments' } })).rejects.toBeDefined();

    expect(localStorage.getItem('payment_token')).toBeNull();
    expect(localStorage.getItem('token')).toBe('jwt');
    expect(storeStub.dispatch).toHaveBeenCalledWith({ type: 'paymentAccess/logout' });
  });

  it('clears the session and sends a superuser back to their login page', async () => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ userType: 'superuser' }));
    window.location.hash = '#/students';

    await expect(onResponseError()({ response: { status: 401 }, config: { url: '/students' } })).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.hash).toBe('#/login/superuser');
  });

  it('sends an owner back to the owner login page', async () => {
    localStorage.setItem('user', JSON.stringify({ userType: 'superuser', role: 'owner' }));
    window.location.hash = '#/dashboard';

    await expect(onResponseError()({ response: { status: 401 }, config: { url: '/students' } })).rejects.toBeDefined();

    expect(window.location.hash).toBe('#/login/owner');
  });

  it('does not redirect a session that is already on a login page', async () => {
    window.location.hash = '#/login/owner';

    await expect(onResponseError()({ response: { status: 401 }, config: { url: '/students' } })).rejects.toBeDefined();

    expect(window.location.hash).toBe('#/login/owner');
  });

  it('reports a refusal to the user', async () => {
    handleApiError.mockReturnValue('Access denied. Insufficient permissions.');

    await expect(onResponseError()({ response: { status: 403 }, config: { url: '/students' } })).rejects.toBeDefined();

    expect(toast.error).toHaveBeenCalledWith('Access denied. Insufficient permissions.');
  });

  it('stays quiet about a refusal on a student page', async () => {
    localStorage.setItem('user', JSON.stringify({ userType: 'student' }));
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/student/dashboard', hash: '' },
      writable: true,
    });

    await expect(onResponseError()({ response: { status: 403 }, config: { url: '/students' } })).rejects.toBeDefined();

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('drops the payment credential when the refusal names a separate login', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/payments', hash: '' },
      writable: true,
    });
    localStorage.setItem('payment_token', 'payment-jwt');
    localStorage.setItem('user', JSON.stringify({ userType: 'teacher' }));
    handleApiError.mockReturnValue('Payments need a separate login.');

    await expect(onResponseError()({ response: { status: 403 }, config: { url: '/payments' } })).rejects.toBeDefined();

    expect(localStorage.getItem('payment_token')).toBeNull();
  });

  it('keeps the payment credential when the refusal is about something else', async () => {
    localStorage.setItem('payment_token', 'payment-jwt');
    localStorage.setItem('user', JSON.stringify({ userType: 'teacher' }));
    handleApiError.mockReturnValue('Not your student.');

    await expect(onResponseError()({ response: { status: 403 }, config: { url: '/payments' } })).rejects.toBeDefined();

    expect(localStorage.getItem('payment_token')).toBe('payment-jwt');
  });

  it('reports any other failure to the user', async () => {
    handleApiError.mockReturnValue('Something went wrong');

    await expect(onResponseError()({ response: { status: 500 }, config: { url: '/students' } })).rejects.toBeDefined();

    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });
});

describe('endpoint wrappers', () => {
  const endpointGroups = Object.entries(api).filter(
    ([name, value]) => name.endsWith('API') && value && typeof value === 'object',
  ) as [string, Record<string, any>][];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports a wrapper group for every backend module', () => {
    expect(endpointGroups.length).toBeGreaterThan(25);
  });

  it.each(endpointGroups)('%s calls the shared client for every endpoint it exposes', (_name, group) => {
    const methods = Object.entries(group).filter(([, value]) => typeof value === 'function');
    expect(methods.length).toBeGreaterThan(0);

    for (const [, method] of methods) {
      vi.clearAllMocks();
      // A few endpoints take a list of ids rather than a single one, so try both shapes.
      try {
        method(1, { center_id: 3 }, 2, 3);
      } catch {
        method([1, 2], { center_id: 3 }, 2, 3);
      }

      const called = [client.get, client.post, client.put, client.patch, client.delete]
        .filter((fn) => fn.mock.calls.length > 0);
      expect(called).toHaveLength(1);
      expect(String(called[0].mock.calls[0][0]).startsWith('/')).toBe(true);
    }
  });
});
