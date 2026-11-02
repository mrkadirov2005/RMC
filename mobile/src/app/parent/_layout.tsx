import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { useT } from '../../i18n/LanguageContext';
import { ParentChildProvider } from '../../screens/ParentChild';
import { OnboardingGate } from '../../screens/OnboardingGate';
import { colors } from '../../theme/tokens';

const icon = (glyph: string) => ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;

// @MOB-104 Parent tabs: Home | My Children | Progress | Payments | More.
export default function ParentLayout() {
  const { status, user } = useAuth();
  const { t } = useT();
  if (status === 'signedOut') return <Redirect href="/login" />;
  if (user && user.role !== 'parent') return <Redirect href="/student" />;
  return (
    <ParentChildProvider>
      {/* @MOB-112 */}
      <OnboardingGate />
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted }}>
        <Tabs.Screen name="index" options={{ title: t.home, tabBarIcon: icon('🏠') }} />
        <Tabs.Screen name="children" options={{ title: t.myChildren, tabBarIcon: icon('👨‍👩‍👧') }} />
        <Tabs.Screen name="progress" options={{ title: t.progress, tabBarIcon: icon('📈') }} />
        <Tabs.Screen name="payments" options={{ title: t.payments, tabBarIcon: icon('💳') }} />
        <Tabs.Screen name="more" options={{ title: t.more, tabBarIcon: icon('⋯') }} />
      </Tabs>
    </ParentChildProvider>
  );
}
