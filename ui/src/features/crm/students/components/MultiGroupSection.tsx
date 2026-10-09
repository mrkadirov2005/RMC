// "Multiple groups" tab: students in more than one subject, and siblings, relatives and friends
// who come together.
import { useState, type ComponentProps } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { MultiGroupStudentsTab } from './MultiGroupStudentsTab';
import { StudentLinksPanel } from './StudentLinksPanel';

export function MultiGroupSection(props: ComponentProps<typeof MultiGroupStudentsTab>) {
  const { t } = useLanguage();
  const [view, setView] = useState<'subjects' | 'links'>('subjects');
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="tablist" aria-label={t('Multiple groups')}>
        {([['subjects', 'In several subjects'], ['links', 'Relatives and friends']] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => setView(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t(label)}
          </button>
        ))}
      </div>
      {view === 'subjects' ? <MultiGroupStudentsTab {...props} /> : <StudentLinksPanel active={props.active} />}
    </div>
  );
}
