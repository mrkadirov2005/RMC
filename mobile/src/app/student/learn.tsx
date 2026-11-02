import { useState } from 'react';
import { Chips, Screen, Title } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { HomeworkList } from '../../screens/homework';
import { AttendanceSection, ResultsSection, ScheduleSection } from '../../screens/learner';

type Section = 'schedule' | 'results' | 'attendance' | 'homework';

// @MOB-121 @MOB-122 @MOB-140 Learn tab: homework, timetable, results, attendance.
export default function Learn() {
  const { t } = useT();
  const [section, setSection] = useState<Section>('homework');
  return (
    <Screen>
      <Title>{t.learn}</Title>
      <Chips<Section>
        options={[
          { value: 'homework', label: t.homework },
          { value: 'schedule', label: t.schedule },
          { value: 'results', label: t.results },
          { value: 'attendance', label: t.attendance },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === 'schedule' ? <ScheduleSection /> : null}
      {section === 'results' ? <ResultsSection /> : null}
      {section === 'attendance' ? <AttendanceSection /> : null}
      {section === 'homework' ? <HomeworkList /> : null}
    </Screen>
  );
}
