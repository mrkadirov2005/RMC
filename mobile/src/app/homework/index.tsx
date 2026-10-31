import { useT } from '../../i18n/LanguageContext';
import { DetailScreen, useChildParam } from '../../screens/DetailScreen';
import { HomeworkList } from '../../screens/homework';

// @MOB-140 All homework of the student, or of a parent's child (?child=).
export default function HomeworkScreen() {
  const { t } = useT();
  const childId = useChildParam();
  return (
    <DetailScreen title={t.homework}>
      <HomeworkList childId={childId} />
    </DetailScreen>
  );
}
