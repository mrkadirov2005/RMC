import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDashboard, useIdToken } from '../../api/queries';
import { useAuth } from '../../auth/AuthContext';
import { QrCode } from '../../components/QrCode';
import { Card, ListRow, Loading, Screen, SectionHeader, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { fullName, initials } from '../../lib/format';
import { colors, space } from '../../theme/tokens';

// @MOB-124 @MOB-125 The ID QR: a signed token that lives 60 seconds, so a screenshot stops
// working within a minute. Shows how long the current code has left.
function IdQr() {
  const { t } = useT();
  const query = useIdToken();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const expiresAt = query.data ? new Date(query.data.expires_at).getTime() : 0;
  const left = Math.max(0, Math.round((expiresAt - now) / 1000));
  useEffect(() => {
    if (query.data && left === 0 && !query.isFetching) void query.refetch();
  }, [left, query]);

  return (
    <Card>
      <View style={styles.qrWrap}>
        {query.data && left > 0 ? <QrCode value={query.data.token} size={190} /> : <View style={styles.qrPlaceholder}><Loading /></View>}
        <Text style={[text.muted, { marginTop: space.sm }]}>{query.data && left > 0 ? t.qrRefreshesIn(left) : t.qrRefreshing}</Text>
        <Text style={[text.muted, { fontSize: 12, textAlign: 'center' }]}>{t.qrHint}</Text>
      </View>
    </Card>
  );
}

// @MOB-124 Profile with the student ID card and groups.
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
      <IdQr />

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
  qrWrap: { alignItems: 'center', gap: 2 },
  qrPlaceholder: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
});
