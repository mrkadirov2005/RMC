import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api, authStorage, paymentStorage } = vi.hoisted(() => ({
  api: {
    roomAPI: { getAll: vi.fn() },
    portalAPI: { getDashboard: vi.fn() },
  },
  authStorage: {
    getStoredAuth: vi.fn(() => ({ token: null, user: null })),
    setStoredAuth: vi.fn(),
    clearStoredAuth: vi.fn(),
  },
  paymentStorage: {
    getStoredPaymentAuth: vi.fn(() => ({ token: null })),
    setStoredPaymentAuth: vi.fn(),
    clearStoredPaymentAuth: vi.fn(),
  },
}));

vi.mock('../../shared/api/api', () => api);
vi.mock('../../shared/auth/authStorage', () => authStorage);
vi.mock('../../shared/auth/paymentAuthStorage', () => paymentStorage);

import authReducer, {
  initializeAuth,
  loginFailure,
  loginSuccess,
  logout,
  setLoading,
  setUser,
} from '../authSlice';
import paymentAccessReducer, {
  initializePaymentAccess,
  paymentLoginFailure,
  paymentLoginSuccess,
  paymentLogout,
  setPaymentLoading,
} from '../paymentAccessSlice';
import serviceStatusReducer, {
  setBackendUnreachable,
  setChecking,
  setHealthy,
  setOffline,
  setStatus,
} from '../serviceStatusSlice';
import roomsReducer, { fetchRooms, fetchRoomsForce } from '../roomsSlice';
import studentDashboardReducer, {
  fetchStudentDashboard,
  fetchStudentDashboardForce,
} from '../studentDashboardSlice';

const user = { id: 1, userType: 'superuser', role: 'owner' } as never;

describe('auth slice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts signed out and uninitialised', () => {
    const state = authReducer(undefined, { type: 'init' });

    expect(state).toMatchObject({ user: null, isAuthenticated: false, isInitialized: false });
  });

  it('records the session and persists the credential on a successful login', () => {
    const state = authReducer(undefined, loginSuccess({ user, token: 'jwt' }));

    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitialized).toBe(true);
    expect(authStorage.setStoredAuth).toHaveBeenCalledWith('jwt', user);
  });

  it('records the reason and stays signed out on a failed login', () => {
    const state = authReducer(undefined, loginFailure('Invalid username or password'));

    expect(state).toMatchObject({ isAuthenticated: false, error: 'Invalid username or password', isInitialized: true });
  });

  it('clears both the ordinary and the payment credential on logout', () => {
    const signedIn = authReducer(undefined, loginSuccess({ user, token: 'jwt' }));

    const state = authReducer(signedIn, logout());

    expect(state.user).toBeNull();
    expect(authStorage.clearStoredAuth).toHaveBeenCalled();
    expect(paymentStorage.clearStoredPaymentAuth).toHaveBeenCalled();
  });

  it('treats a user set directly as a signed-in session', () => {
    const state = authReducer(undefined, setUser(user));

    expect(state.isAuthenticated).toBe(true);
  });

  it('treats a cleared user as a signed-out session', () => {
    const state = authReducer(undefined, setUser(null));

    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it('restores a stored session on start-up', () => {
    authStorage.getStoredAuth.mockReturnValue({ token: 'jwt', user });

    const state = authReducer(undefined, initializeAuth());

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
  });

  it('starts signed out when nothing was stored', () => {
    authStorage.getStoredAuth.mockReturnValue({ token: null, user: null });

    const state = authReducer(undefined, initializeAuth());

    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it('tracks the in-flight flag', () => {
    expect(authReducer(undefined, setLoading(true)).loading).toBe(true);
  });
});

describe('payment access slice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts without payment access', () => {
    const state = paymentAccessReducer(undefined, { type: 'init' });

    expect(state).toMatchObject({ isAuthenticated: false, isInitialized: false });
  });

  it('persists the payment credential on a successful login', () => {
    const state = paymentAccessReducer(undefined, paymentLoginSuccess({ token: 'payment-jwt' }));

    expect(state.isAuthenticated).toBe(true);
    expect(paymentStorage.setStoredPaymentAuth).toHaveBeenCalledWith('payment-jwt');
  });

  it('records the reason on a failed payment login', () => {
    const state = paymentAccessReducer(undefined, paymentLoginFailure('Wrong password'));

    expect(state).toMatchObject({ isAuthenticated: false, error: 'Wrong password' });
  });

  it('clears the stored credential on logout', () => {
    const state = paymentAccessReducer(undefined, paymentLogout());

    expect(state.isAuthenticated).toBe(false);
    expect(paymentStorage.clearStoredPaymentAuth).toHaveBeenCalled();
  });

  it('restores payment access from storage on start-up', () => {
    paymentStorage.getStoredPaymentAuth.mockReturnValue({ token: 'payment-jwt' });

    const state = paymentAccessReducer(undefined, initializePaymentAccess());

    expect(state.isAuthenticated).toBe(true);
  });

  it('starts without access when nothing was stored', () => {
    paymentStorage.getStoredPaymentAuth.mockReturnValue({ token: null });

    const state = paymentAccessReducer(undefined, initializePaymentAccess());

    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitialized).toBe(true);
  });

  it('tracks the in-flight flag', () => {
    expect(paymentAccessReducer(undefined, setPaymentLoading(true)).loading).toBe(true);
  });
});

describe('service status slice', () => {
  it('starts in the checking state with no timestamp', () => {
    const state = serviceStatusReducer(undefined, { type: 'init' });

    expect(state).toEqual({ status: 'checking', lastCheckedAt: null });
  });

  it.each([
    [setHealthy, 'healthy'],
    [setOffline, 'offline'],
    [setBackendUnreachable, 'backend-unreachable'],
    [setChecking, 'checking'],
  ])('records the %# status and stamps the time', (action, expected) => {
    const state = serviceStatusReducer(undefined, (action as any)());

    expect(state.status).toBe(expected);
    expect(state.lastCheckedAt).toEqual(expect.any(Number));
  });

  it('accepts a status set directly', () => {
    const state = serviceStatusReducer(undefined, setStatus('offline'));

    expect(state.status).toBe('offline');
  });
});

describe('rooms slice', () => {
  const makeStore = () => configureStore({ reducer: { rooms: roomsReducer } });

  beforeEach(() => vi.clearAllMocks());

  it('loads the rooms and records when they were fetched', async () => {
    const store = makeStore();
    api.roomAPI.getAll.mockResolvedValue({ data: [{ room_id: 1 }] });

    await store.dispatch(fetchRoomsForce());

    expect(store.getState().rooms.items).toHaveLength(1);
    expect(store.getState().rooms.lastFetched).toEqual(expect.any(Number));
  });

  it('accepts a bare array response', async () => {
    const store = makeStore();
    const response: any = [{ room_id: 1 }];
    api.roomAPI.getAll.mockResolvedValue(response);

    await store.dispatch(fetchRoomsForce());

    expect(store.getState().rooms.items).toHaveLength(1);
  });

  it('treats a response that is not a list as empty', async () => {
    const store = makeStore();
    api.roomAPI.getAll.mockResolvedValue({ data: { unexpected: true } });

    await store.dispatch(fetchRoomsForce());

    expect(store.getState().rooms.items).toEqual([]);
  });

  it('records the failure message', async () => {
    const store = makeStore();
    api.roomAPI.getAll.mockRejectedValue(new Error('Rooms are unavailable'));

    await store.dispatch(fetchRoomsForce());

    expect(store.getState().rooms.error).toBe('Rooms are unavailable');
  });

  it('serves a second read from cache', async () => {
    const store = makeStore();
    api.roomAPI.getAll.mockResolvedValue({ data: [{ room_id: 1 }] });

    await store.dispatch(fetchRooms());
    await store.dispatch(fetchRooms());

    expect(api.roomAPI.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().rooms.items).toHaveLength(1);
  });
});

describe('student dashboard slice', () => {
  const makeStore = () => configureStore({ reducer: { studentDashboard: studentDashboardReducer } });

  beforeEach(() => vi.clearAllMocks());

  it('loads the dashboard payload', async () => {
    const store = makeStore();
    api.portalAPI.getDashboard.mockResolvedValue({ data: { student: { student_id: 1 } } });

    await store.dispatch(fetchStudentDashboardForce());

    expect(store.getState().studentDashboard.data).toEqual({ student: { student_id: 1 } });
  });

  it('shows the loader only while there is nothing to display', async () => {
    const store = makeStore();
    api.portalAPI.getDashboard.mockReturnValue(new Promise(() => {}));

    store.dispatch(fetchStudentDashboardForce());

    expect(store.getState().studentDashboard.loading).toBe(true);
  });

  it('keeps the previous payload on screen while refreshing', async () => {
    const store = makeStore();
    api.portalAPI.getDashboard.mockResolvedValue({ data: { student: { student_id: 1 } } });
    await store.dispatch(fetchStudentDashboardForce());

    api.portalAPI.getDashboard.mockReturnValue(new Promise(() => {}));
    store.dispatch(fetchStudentDashboardForce());

    expect(store.getState().studentDashboard.loading).toBe(false);
    expect(store.getState().studentDashboard.data).not.toBeNull();
  });

  it('records the failure message', async () => {
    const store = makeStore();
    api.portalAPI.getDashboard.mockRejectedValue(new Error('Portal is down'));

    await store.dispatch(fetchStudentDashboardForce());

    expect(store.getState().studentDashboard.error).toBe('Portal is down');
  });

  it('serves a second read from cache', async () => {
    const store = makeStore();
    api.portalAPI.getDashboard.mockResolvedValue({ data: { student: { student_id: 1 } } });

    await store.dispatch(fetchStudentDashboard());
    await store.dispatch(fetchStudentDashboard());

    expect(api.portalAPI.getDashboard).toHaveBeenCalledTimes(1);
  });
});
