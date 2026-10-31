import { useState } from 'react';
import { Chips, ListRow, Screen, Tag, Title } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { AttendanceSection, ResultsSection, ScheduleSection } from '../../screens/learner';

type Section = 'schedule' | 'results' | 'attendance' | 'homework';

// @MOB-121 @MOB-122 Learn tab: timetable, results, attendance; homework arrives with MOB-140.
export default function Learn() {
  const { t } = useT();
  const [section, setSection] = useState<Section>('schedule');
  return (
    <Screen>
      <Title>{t.learn}</Title>
      <Chips<Section>
        options={[
          { value: 'schedule', label: t.schedule },
          { value: 'results', label: t.results },
          { value: 'attendance', label: t.attendance },
          { value: 'homework', label: t.homework },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === 'schedule' ? <ScheduleSection /> : null}
      {section === 'results' ? <ResultsSection /> : null}
      {section === 'attendance' ? <AttendanceSection /> : null}
      {section === 'homework' ? <ListRow icon="📝" title={t.homework} subtitle={t.homeworkSoon} right={<Tag label={t.comingSoon} />} /> : null}
    </Screen>
  );
}
