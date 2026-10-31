import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_VERSION } from '../config';

// @MOB-107 Crash reporting with Sentry. Off unless EXPO_PUBLIC_SENTRY_DSN is set at build time.
// Events carry the app release and the user's role, never names, phones, logins or tokens.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || (__DEV__ ? 'development' : 'production');
export const crashReportingEnabled = Boolean(DSN) && Platform.OS !== 'web';

const buildNumber = () =>
  String(Platform.OS === 'ios' ? Constants.expoConfig?.ios?.buildNumber ?? '' : Constants.expoConfig?.android?.versionCode ?? '') || undefined;

// Masks what could identify a person: e-mails, phone-like digit runs, bearer tokens, and the
// query string of URLs (signed links and tokens live there).
export const scrubText = (value: string) =>
  value
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [token]')
    .replace(/(https?:\/\/[^\s?#]+)\?[^\s#]*/g, '$1?[query]')
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[number]');

const scrubDeep = (value: unknown, depth = 0): unknown => {
  if (depth > 6) return value;
  if (typeof value === 'string') return scrubText(value);
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        /password|token|authorization|cookie|phone|username|email|first_name|last_name|name$/i.test(k) ? [k, '[filtered]'] : [k, scrubDeep(v, depth + 1)],
      ),
    );
  }
  return value;
};

type ScrubbableEvent = { user?: unknown; request?: { headers?: unknown; cookies?: unknown; data?: unknown; url?: string }; [key: string]: unknown };

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const copy = scrubDeep(event) as T;
  delete copy.user;
  if (copy.request) {
    delete copy.request.headers;
    delete copy.request.cookies;
    delete copy.request.data;
  }
  return copy;
}

export function initCrashReporting() {
  if (!crashReportingEnabled) return;
  Sentry.init({
    dsn: DSN,
    release: `temurbek-school@${APP_VERSION}`,
    dist: buildNumber(),
    environment: APP_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeSend: (event) => scrubEvent(event as unknown as ScrubbableEvent) as unknown as typeof event,
    beforeBreadcrumb: (crumb) => scrubDeep(crumb) as typeof crumb,
  });
}

// Only the role, to tell student and parent problems apart.
export function setCrashRole(role: 'student' | 'parent' | null) {
  if (crashReportingEnabled) Sentry.setTag('role', role ?? 'signed_out');
}

// For checking the setup from Settings on test builds.
export function sendTestCrash() {
  Sentry.captureException(new Error(`Sentry test from ${APP_ENV} ${APP_VERSION}`));
}

export const withCrashReporting = <P extends Record<string, unknown>>(component: React.ComponentType<P>) =>
  crashReportingEnabled ? Sentry.wrap(component) : component;
