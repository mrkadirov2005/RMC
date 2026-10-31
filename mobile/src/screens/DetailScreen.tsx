import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { Screen } from '../components/ui';
import { colors } from '../theme/tokens';

// A pushed screen with a header and back button. Parents pass ?child=<id>.
export function useChildParam() {
  const { child } = useLocalSearchParams<{ child?: string }>();
  const id = Number(child);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function DetailScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerLeft: () => (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontSize: 24, paddingRight: 12 }}>‹</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>{children}</Screen>
    </>
  );
}
