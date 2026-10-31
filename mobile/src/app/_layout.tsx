import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { UpdateGate } from '../components/UpdateGate';
import { LanguageProvider } from '../i18n/LanguageContext';
import { initCrashReporting, setCrashRole, withCrashReporting } from '../lib/crash';
import { PushNotifications } from '../lib/push';
import { colors } from '../theme/tokens';

// @MOB-107 Before anything renders, so start-up crashes are caught too.
initCrashReporting();

// @MOB-126 Push registration and tap handling need the signed-in state.
function PushBridge() {
  const { status, user } = useAuth();
  // @MOB-107 Crash reports carry the role only.
  useEffect(() => setCrashRole(status === 'signedIn' ? (user?.role ?? null) : null), [status, user?.role]);
  return <PushNotifications signedIn={status === 'signedIn'} />;
}

// @MOB-105 Cached data stays fresh for a minute and is kept for a day, so screens open instantly
// and still show the last data when offline.
const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, gcTime: 24 * 60 * 60_000, retry: 1 } },
  });

function RootLayout() {
  const [queryClient] = useState(makeQueryClient);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <PushBridge />
            {/* @MOB-175 Version check for the app installed from the website. */}
            <UpdateGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.primary,
                  headerShadowVisible: false,
                  headerStyle: { backgroundColor: colors.background },
                }}
              />
            </UpdateGate>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default withCrashReporting(RootLayout);
