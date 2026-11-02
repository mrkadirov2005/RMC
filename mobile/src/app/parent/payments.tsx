import { Empty, Screen, Title } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { PaymentsSection } from '../../screens/learner';
import { ChildSwitcher, useParentChild } from '../../screens/ParentChild';

// @MOB-133 Parent payments tab for the selected child. Read-only until a payment provider is chosen.
export default function ParentPayments() {
  const { t } = useT();
  const { childId } = useParentChild();
  return (
    <Screen>
      <Title>{t.payments}</Title>
      <ChildSwitcher />
      {childId == null ? <Empty text={t.linkChildHint} /> : <PaymentsSection childId={childId} />}
    </Screen>
  );
}
