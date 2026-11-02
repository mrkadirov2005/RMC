// "Total and monthly" tab: the selected month's salary status (paid vs unpaid teachers) on top,
// the last six months and each teacher's history below. Formerly two tabs.

import { SectionPanel } from '@/components/common/SectionPanel';
import { useLanguage } from '@/i18n/LanguageContext';
import { SalaryMonthlyTab } from './SalaryMonthlyTab';
import { SalaryTotalTab } from './SalaryTotalTab';

type SalaryTotalTabProps = Parameters<typeof SalaryTotalTab>[0];

export const SalaryOverviewTab = ({ year, month, summary }: SalaryTotalTabProps) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <SectionPanel>
        <h2 className="mb-2 text-sm font-bold">{t('Selected month')}</h2>
        <SalaryTotalTab year={year} month={month} summary={summary} />
      </SectionPanel>
      <SectionPanel>
        <h2 className="mb-3 text-sm font-bold">{t('By month')}</h2>
        <SalaryMonthlyTab />
      </SectionPanel>
    </div>
  );
};
