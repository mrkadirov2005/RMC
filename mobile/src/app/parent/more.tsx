import { router } from 'expo-router';
import { ListRow, Screen, Tag, Title } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { useParentChild } from '../../screens/ParentChild';

// @MOB-134 Parent "More": coins, settings, and the R2 items shown as coming soon.
export default function More() {
  const { t } = useT();
  const { childId } = useParentChild();
  return (
    <Screen>
      <Title>{t.more}</Title>
      {childId != null ? <ListRow icon="🪙" title={t.coins} onPress={() => router.push(`/coins?child=${childId}`)} /> : null}
      <ListRow icon="⚙️" title={t.settings} onPress={() => router.push('/settings')} />
      <ListRow icon="💬" title={`${t.teacher} · chat`} right={<Tag label={t.comingSoon} />} />
      <ListRow icon="🔗" title={t.officialLinks} right={<Tag label={t.comingSoon} />} />
      <ListRow icon="📜" title={t.rules} right={<Tag label={t.comingSoon} />} />
      <ListRow icon="🙋" title={t.help} right={<Tag label={t.comingSoon} />} />
    </Screen>
  );
}
