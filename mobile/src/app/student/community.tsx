import { useState } from 'react';
import { Text } from 'react-native';
import { useLeaderboard } from '../../api/queries';
import { Card, Chips, Empty, ListRow, QueryView, Screen, SectionHeader, Tag, Title, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { colors } from '../../theme/tokens';

// @MOB-123 Community tab: the leaderboard now; group chat and news follow in R2 (MOB-241, MOB-242).
export default function Community() {
  const { t } = useT();
  const [scope, setScope] = useState<'class' | 'center'>('class');
  const query = useLeaderboard(scope);
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <Title>{t.leaderboard}</Title>
      <Chips<'class' | 'center'>
        options={[
          { value: 'class', label: t.myGroup },
          { value: 'center', label: t.center },
        ]}
        value={scope}
        onChange={setScope}
      />
      <QueryView query={query}>
        {(data) => (
          <>
            {data.me ? (
              <Card tone="blue">
                <Text style={[text.white, { opacity: 0.8 }]}>{t.you}</Text>
                <Text style={[text.white, { fontSize: 22, fontWeight: '800' }]}>
                  #{data.me.rank} · 🪙 {data.me.coins.toLocaleString('en-US')}
                </Text>
              </Card>
            ) : null}
            {data.items.length ? (
              data.items.map((entry) => (
                <ListRow
                  key={`${entry.rank}-${entry.name}`}
                  title={`${entry.rank}. ${entry.name}${entry.is_me ? ` (${t.you})` : ''}`}
                  right={<Text style={[text.bold, entry.is_me && { color: colors.primary }]}>🪙 {entry.coins.toLocaleString('en-US')}</Text>}
                />
              ))
            ) : (
              <Empty />
            )}
            <Text style={[text.muted, { marginTop: 8 }]}>{t.leaderboardPrivacy}</Text>
          </>
        )}
      </QueryView>
      <SectionHeader title={t.community} />
      <ListRow icon="💬" title={t.groupChat} right={<Tag label={t.comingSoon} />} />
      <ListRow icon="📣" title={t.news} right={<Tag label={t.comingSoon} />} />
    </Screen>
  );
}
