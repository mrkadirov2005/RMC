import { useT } from '../i18n/LanguageContext';
import { DetailScreen, useChildParam } from '../screens/DetailScreen';
import { AttendanceSection } from '../screens/learner';

// @MOB-121 Attendance or timetable detail screen, for a student or a parent's child
export default function AttendanceScreen() {
  const { t } = useT();
  const childId = useChildParam();
  return (
    <DetailScreen title={t.attendance}>
      <AttendanceSection childId={childId} />
    </DetailScreen>
  );
}
