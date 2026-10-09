// Leads: the three lists the client asked for. Telegram registrations (people who signed up through
// the bot), people waiting for a suitable group, and people gathered for a new group.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { leadAPI } from './api';
import TelegramRegistrationsPage from './TelegramRegistrationsPage';
import { LeadsPanel } from './LeadsPanel';

const TABS = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'waiting_group', label: 'Waiting for a group' },
  { id: 'new_group', label: 'For a new group' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const LeadsPage = () => {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((item) => item.id === params.get('tab')) ? params.get('tab') : 'telegram') as TabId;
  const [due, setDue] = useState(0);

  const loadDue = useCallback(() => {
    leadAPI.dueCount().then((response) => setDue(Number(getApiPayload<{ due: number }>(response)?.due || 0))).catch(() => setDue(0));
  }, []);
  useEffect(() => { loadDue(); }, [loadDue]);

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-7xl px-4 pt-4">
        <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="tablist" aria-label={t('Leads')}>
          {TABS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setParams({ tab: item.id })}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === item.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t(item.label)}
            </button>
          ))}
        </div>
        {due > 0 && <span className="ml-3 self-center rounded-md bg-rose-600 px-2 py-1 text-xs font-bold text-white">{t('Call today: {count}', { count: due })}</span>}
      </div>
      {tab === 'telegram' ? <TelegramRegistrationsPage /> : (
        <div className="mx-auto max-w-7xl px-4 pb-6">
          <LeadsPanel key={tab} stage={tab} onChanged={loadDue} />
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
