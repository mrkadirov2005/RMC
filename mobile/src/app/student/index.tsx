import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useDashboard } from '../../api/queries';
import { useAuth } from '../../auth/AuthContext';
import { Card, ListRow, Pill, QueryView, Screen, SectionHeader, Tag, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { initials } from '../../lib/format';
import { NextLessonCard, NotificationBell, RecentResults, SchoolNews, StatsRow } from '../../screens/learner';
import { colors, space } from '../../theme/tokens';

// @MOB-120 Student home: next lesson, attendance, coins, latest results and what is coming.
export default function StudentHome() {
  const { t } = useT();
  const { user } = useAuth();
  const query = useDashboard();

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.first_name, user?.last_name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>
            {t.hello}, {user?.first_name || ''}
          </Text>
          <Text style={text.muted}>{query.data?.student.groups.map((g) => g.class_name).filter(Boolean).join(' · ') || user?.class_name || ''}</Text>
        </View>
        {query.data ? <Pill label={`🪙 ${query.data.coins.balance.toLocaleString('en-US')}`} onPress={() => router.push('/coins')} /> : null}
        <NotificationBell />
      </View>

      <QueryView query={query}>
        {(data) => (
          <>
            {data.student.is_frozen ? (
              <Card>
                <Tag label={t.frozen} tone="warn" />
              </Card>
            ) : null}
            <SchoolNews />
            <NextLessonCard slots={data.schedule} />
            <StatsRow data={data} />
            <ListRow icon="🗓" title={t.schedule} onPress={() => router.push('/schedule')} />
            <SectionHeader title={t.homework} />
            <ListRow icon="📝" title={t.homework} subtitle={t.homeworkSoon} right={<Tag label={t.comingSoon} />} />
            <RecentResults rows={data.recent_grades} />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '700' },
  hello: { fontSize: 18, fontWeight: '700', color: colors.text },
});
