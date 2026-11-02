import { useT } from '../i18n/LanguageContext';
import { DetailScreen, useChildParam } from '../screens/DetailScreen';
import { CoinsSection } from '../screens/learner';

// @MOB-123 Coin balance and history screen
export default function CoinsScreen() {
  const { t } = useT();
  const childId = useChildParam();
  return (
    <DetailScreen title={t.coins}>
      <CoinsSection childId={childId} />
    </DetailScreen>
  );
}
