import { useT } from '../i18n/LanguageContext';
import { DetailScreen, useChildParam } from '../screens/DetailScreen';
import { PaymentsSection } from '../screens/learner';

// @MOB-133 Payments screen (read-only)
export default function PaymentsScreen() {
  const { t } = useT();
  const childId = useChildParam();
  return (
    <DetailScreen title={t.payments}>
      <PaymentsSection childId={childId} />
    </DetailScreen>
  );
}
