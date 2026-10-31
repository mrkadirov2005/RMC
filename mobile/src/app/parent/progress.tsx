import { router } from 'expo-router';
import { Empty, ListRow, Screen, Title } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { ResultsSection } from '../../screens/learner';
import { ChildSwitcher, useParentChild } from '../../screens/ParentChild';

// @MOB-132 Parent progress: monthly averages per group, results, links to attendance and timetable.
export default function Progress() {
  const { t } = useT();
  const { childId } = useParentChild();
  return (
    <Screen>
      <Title>{t.progress}</Title>
      <ChildSwitcher />
      {childId == null ? (
        <Empty text={t.linkChildHint} />
      ) : (
        <>
          <ListRow icon="📝" title={t.homework} onPress={() => router.push(`/homework?child=${childId}`)} />
          <ListRow icon="📅" title={t.attendance} onPress={() => router.push(`/attendance?child=${childId}`)} />
          <ListRow icon="🗓" title={t.schedule} onPress={() => router.push(`/schedule?child=${childId}`)} />
          <ResultsSection childId={childId} />
        </>
      )}
    </Screen>
  );
}
