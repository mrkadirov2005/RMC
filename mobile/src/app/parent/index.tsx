import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useDashboard } from '../../api/queries';
import { useAuth } from '../../auth/AuthContext';
import { Card, Empty, ListRow, QueryView, Screen, Tag, Title, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { money, shortDate } from '../../lib/format';
import { NextLessonCard, RecentResults, StatsRow } from '../../screens/learner';
import { ChildSwitcher, useParentChild } from '../../screens/ParentChild';

// @MOB-130 Parent home for the selected child: payment due, next lesson, attendance, coins,
// latest results.
export default function ParentHome() {
  const { t } = useT();
  const { user } = useAuth();
  const { childId, child, query: childrenQuery } = useParentChild();
  const query = useDashboard(childId, childId != null);

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void Promise.all([query.refetch(), childrenQuery.refetch()])}>
      <Title>
        {t.hello}, {user?.first_name || ''}
      </Title>
      <ChildSwitcher />
      <QueryView query={childrenQuery}>
        {(data) =>
          data.items.length === 0 ? (
            <Empty text={t.linkChildHint} />
          ) : (
            <QueryView query={query}>
              {(dash) => (
                <>
                  <Text style={[text.muted, { marginBottom: 8 }]}>
                    {[child?.first_name, child?.last_name].filter(Boolean).join(' ')} · {dash.student.groups.map((g) => g.class_name).filter(Boolean).join(', ')}
                  </Text>
                  {dash.payments.outstanding > 0 ? (
                    <ListRow
                      icon="💳"
                      title={`${t.outstanding}: ${money(dash.payments.outstanding, t.currency)}`}
                      subtitle={dash.payments.next_due_date ? `${t.dueDate}: ${shortDate(dash.payments.next_due_date)}` : null}
                      right={<Tag label={t.payments} tone="warn" />}
                      onPress={() => router.push('/parent/payments')}
                    />
                  ) : (
                    <Card>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text>✅</Text>
                        <Text style={text.bold}>{t.noDebt}</Text>
                      </View>
                    </Card>
                  )}
                  <NextLessonCard slots={dash.schedule} />
                  <StatsRow data={dash} childId={childId} />
                  <RecentResults rows={dash.recent_grades} childId={childId} />
                </>
              )}
            </QueryView>
          )
        }
      </QueryView>
    </Screen>
  );
}
