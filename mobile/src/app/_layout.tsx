import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../auth/AuthContext';
import { LanguageProvider } from '../i18n/LanguageContext';
import { colors } from '../theme/tokens';

// @MOB-105 Cached data stays fresh for a minute and is kept for a day, so screens open instantly
// and still show the last data when offline.
const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, gcTime: 24 * 60 * 60_000, retry: 1 } },
  });

export default function RootLayout() {
  const [queryClient] = useState(makeQueryClient);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                headerTintColor: colors.primary,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.background },
              }}
            />
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
