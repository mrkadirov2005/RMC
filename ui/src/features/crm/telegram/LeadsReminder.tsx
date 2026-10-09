// Dashboard reminder: how many people the admin promised to call back today (or earlier).
import { useEffect, useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { leadAPI } from './api';

export function LeadsReminder() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [due, setDue] = useState(0);

  useEffect(() => {
    leadAPI.dueCount().then((response) => setDue(Number(getApiPayload<{ due: number }>(response)?.due || 0))).catch(() => setDue(0));
  }, []);

  if (due === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" role="status">
      <span className="flex items-center gap-2 text-sm font-semibold"><PhoneCall className="h-4 w-4" />{t('{count} people are waiting for your call today.', { count: due })}</span>
      <Button size="sm" variant="outline" onClick={() => navigate('/telegram-registrations?tab=waiting_group')}>{t('Open the list')}</Button>
    </div>
  );
}
