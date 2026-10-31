import { useT } from '../i18n/LanguageContext';
import { DetailScreen, useChildParam } from '../screens/DetailScreen';
import { ResultsSection } from '../screens/learner';

// @MOB-122 Results screen with monthly averages per group
export default function ResultsScreen() {
  const { t } = useT();
  const childId = useChildParam();
  return (
    <DetailScreen title={t.results}>
      <ResultsSection childId={childId} />
    </DetailScreen>
  );
}
