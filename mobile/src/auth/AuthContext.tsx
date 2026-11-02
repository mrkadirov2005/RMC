import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setTokenPersistence, TOKENS_KEY, type Tokens } from '../api/client';
import type { LoginResponse, Role, User } from '../api/types';
import { APP_VERSION } from '../config';
import { storage } from '../lib/storage';

const DEVICE_KEY = 'ts.device.v1';

type Status = 'loading' | 'signedOut' | 'signedIn';
export type SignInResult = 'ok' | 'role_required' | 'invalid' | 'inactive' | 'network' | 'error';

type AuthValue = {
  status: Status;
  user: User | null;
  signIn: (username: string, password: string, role?: Role) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

// @MOB-110 A stable id per installation, so signing in again replaces this device's session.
const deviceId = async () => {
  const saved = await storage.get(DEVICE_KEY);
  if (saved) return saved;
  const id = Crypto.randomUUID();
  await storage.set(DEVICE_KEY, id);
  return id;
};

setTokenPersistence(async (tokens: Tokens | null) => {
  if (tokens) await storage.set(TOKENS_KEY, JSON.stringify(tokens));
  else await storage.remove(TOKENS_KEY);
});

// @MOB-110 @MOB-102 Restores the saved session on start, signs in and out.
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  const clear = useCallback(() => {
    setUser(null);
    setStatus('signedOut');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    api.setSignedOutHandler(clear);
    (async () => {
      const saved = await storage.get(TOKENS_KEY);
      if (!saved) return clear();
      try {
        await api.setTokens(JSON.parse(saved));
        const me = await api.request<User>('/me');
        setUser(me);
        setStatus('signedIn');
      } catch (error) {
        // Offline at start: keep the saved session; screens show cached data or a retry.
        if (error instanceof ApiError && error.status === 0) {
          setStatus('signedIn');
          return;
        }
        await api.signOutLocally();
      }
    })();
    return () => api.setSignedOutHandler(null);
  }, [clear]);

  const signIn = useCallback(async (username: string, password: string, role?: Role): Promise<SignInResult> => {
    try {
      const body: LoginResponse = await api.raw('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
          role,
          device_id: await deviceId(),
          device_name: `${Platform.OS} device`,
          platform: Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web' ? Platform.OS : undefined,
          app_version: APP_VERSION,
        }),
      });
      await api.setTokens({ access_token: body.access_token, refresh_token: body.refresh_token });
      setUser(body.user);
      setStatus('signedIn');
      return 'ok';
    } catch (error) {
      if (!(error instanceof ApiError)) return 'error';
      if (error.code === 'ROLE_REQUIRED') return 'role_required';
      if (error.code === 'ACCOUNT_INACTIVE') return 'inactive';
      if (error.status === 401 || error.status === 400) return 'invalid';
      if (error.status === 0) return 'network';
      return 'error';
    }
  }, []);

  const signOut = useCallback(async () => {
    const tokens = api.getTokens();
    if (tokens?.refresh_token) {
      try {
        await api.raw('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: tokens.refresh_token }) });
      } catch {
        // Signing out locally still works offline; the server session expires on its own.
      }
    }
    await api.signOutLocally();
  }, []);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
