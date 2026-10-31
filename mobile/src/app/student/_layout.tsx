import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { useT } from '../../i18n/LanguageContext';
import { colors } from '../../theme/tokens';

const icon = (glyph: string) => ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;

// @MOB-104 Student tabs: Home | Learn | Practice | Community | Profile.
export default function StudentLayout() {
  const { status, user } = useAuth();
  const { t } = useT();
  if (status === 'signedOut') return <Redirect href="/login" />;
  if (user && user.role !== 'student') return <Redirect href="/parent" />;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted }}>
      <Tabs.Screen name="index" options={{ title: t.home, tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="learn" options={{ title: t.learn, tabBarIcon: icon('📚') }} />
      <Tabs.Screen name="practice" options={{ title: t.practice, tabBarIcon: icon('🎯') }} />
      <Tabs.Screen name="community" options={{ title: t.community, tabBarIcon: icon('💬') }} />
      <Tabs.Screen name="profile" options={{ title: t.profile, tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
