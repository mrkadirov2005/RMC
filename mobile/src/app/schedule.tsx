import { useT } from '../i18n/LanguageContext';
import { DetailScreen, useChildParam } from '../screens/DetailScreen';
import { ScheduleSection } from '../screens/learner';

// @MOB-121 Attendance or timetable detail screen, for a student or a parent's child
export default function ScheduleScreen() {
  const { t } = useT();
  const childId = useChildParam();
  return (
    <DetailScreen title={t.schedule}>
      <ScheduleSection childId={childId} />
    </DetailScreen>
  );
}
