import { router } from 'expo-router';
import { ListRow, Screen, Tag, Title } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { useParentChild } from '../../screens/ParentChild';

// @MOB-134 Parent "More": coins, announcements, rules, links, help, settings. Teacher chat is R2.
export default function More() {
  const { t } = useT();
  const { childId } = useParentChild();
  const child = childId != null ? `?child=${childId}` : '';
  return (
    <Screen>
      <Title>{t.more}</Title>
      {childId != null ? <ListRow icon="🪙" title={t.coins} onPress={() => router.push(`/coins${child}`)} /> : null}
      <ListRow icon="📣" title={t.announcements} onPress={() => router.push('/announcements')} />
      <ListRow icon="📜" title={t.rules} onPress={() => router.push('/rules')} />
      <ListRow icon="🔗" title={t.officialLinks} onPress={() => router.push('/links')} />
      <ListRow icon="🙋" title={t.helpTitle} onPress={() => router.push(`/help${child}`)} />
      <ListRow icon="⚙️" title={t.settings} onPress={() => router.push('/settings')} />
      <ListRow icon="💬" title={`${t.teacher} · chat`} right={<Tag label={t.comingSoon} />} />
    </Screen>
  );
}
