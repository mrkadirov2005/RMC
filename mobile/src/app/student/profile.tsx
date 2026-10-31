import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useDashboard } from '../../api/queries';
import { useAuth } from '../../auth/AuthContext';
import { Card, ListRow, Screen, SectionHeader, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { fullName, initials } from '../../lib/format';
import { colors, space } from '../../theme/tokens';

// @MOB-124 Profile with the student ID card and groups. The rotating QR code needs MOB-125.
export default function Profile() {
  const { t } = useT();
  const { user } = useAuth();
  const dashboard = useDashboard();
  const groups = dashboard.data?.student.groups ?? [];

  return (
    <Screen>
      <Card tone="blue">
        <View style={styles.idRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user?.first_name, user?.last_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[text.white, { fontSize: 18, fontWeight: '700' }]}>{fullName(user?.first_name, user?.last_name)}</Text>
            <Text style={[text.white, { opacity: 0.85 }]}>{groups.map((g) => g.class_name).filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
        <Text style={[text.white, { opacity: 0.85, marginTop: space.md, fontSize: 12 }]}>
          {t.digitalId} · ID {user?.id}
        </Text>
      </Card>

      <SectionHeader title={t.groups} />
      {groups.map((g) => (
        <ListRow key={g.student_id} icon="👥" title={g.class_name || '—'} subtitle={g.teacher_name ? `${t.teacher}: ${g.teacher_name}` : null} />
      ))}

      <SectionHeader title={t.more} />
      <ListRow icon="🪙" title={t.coins} onPress={() => router.push('/coins')} />
      <ListRow icon="💳" title={t.payments} onPress={() => router.push('/payments')} />
      <ListRow icon="⚙️" title={t.settings} onPress={() => router.push('/settings')} />
      <ListRow icon="📣" title={t.announcements} onPress={() => router.push('/announcements')} />
      <ListRow icon="📜" title={t.rules} onPress={() => router.push('/rules')} />
      <ListRow icon="🔗" title={t.officialLinks} onPress={() => router.push('/links')} />
      <ListRow icon="🙋" title={t.helpTitle} onPress={() => router.push('/help')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  idRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
});
