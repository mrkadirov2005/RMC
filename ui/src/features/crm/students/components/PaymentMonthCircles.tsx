import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Student } from '../types';
import { recentMonthKeys, type PaymentMonthState } from '../utils/paymentMonths';

// Short Uzbek month names, the panel's language.
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
export const monthShortLabel = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1] || key;

// Inline colors: the panel's theme overrides recolor Tailwind background classes.
const STATE_STYLE: Record<PaymentMonthState, { backgroundColor: string; borderColor: string }> = {
  full: { backgroundColor: '#10b981', borderColor: '#10b981' },
  partial: { backgroundColor: '#facc15', borderColor: '#eab308' },
  none: { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
  outside: { backgroundColor: 'transparent', borderColor: '#94a3b8' },
};
const LOADING_STYLE = { backgroundColor: '#e2e8f0', borderColor: '#e2e8f0' };

const STATE_LABEL: Record<PaymentMonthState, string> = {
  full: 'Paid in full',
  partial: 'Partly paid',
  none: 'Not paid',
  outside: 'Not in the group this month',
};

const money = (value: number) => Math.round(value).toLocaleString('en-US').replace(/,/g, ' ');

/** Column header: the three month names, oldest on the left, in line with the circles. */
export const PaymentMonthsHeader = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-0.5">
      <span>{t('Payments')}</span>
      <span className="flex gap-1 font-normal normal-case text-muted-foreground">
        {recentMonthKeys().map((key) => (
          <span key={key} className="w-7 text-center text-[0.625rem]">
            {monthShortLabel(key)}
          </span>
        ))}
      </span>
    </div>
  );
};

const MONTHS_FULL = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const monthFullLabel = (key: string) => `${MONTHS_FULL[Number(key.slice(5, 7)) - 1] || key} ${key.slice(0, 4)}`;

/** The month before last, last month and this month: green paid, yellow partly, red not paid, hollow not in the group.
 * Hovering (or focusing) a circle names its month and shows the amounts. */
export const PaymentMonthCircles = ({ student, showLabels = false }: { student: Student; showLabels?: boolean }) => {
  const { t } = useLanguage();
  const months = student.payment_months;
  if (months === null) {
    return <span className="text-xs text-muted-foreground" title={t('Could not load the data.')}>?</span>;
  }
  const keys = months ? months.map((month) => month.key) : recentMonthKeys();
  return (
    <TooltipProvider delayDuration={0}>
      <div className="inline-flex gap-1" aria-label={t('Payments')}>
        {keys.map((key, index) => {
          const month = months?.[index];
          const status = month ? t(STATE_LABEL[month.state]) : t('Loading...');
          const amounts = month && month.state !== 'outside' ? `${money(month.paid)} / ${money(month.expected)} so'm` : '';
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <div className="flex w-7 cursor-default flex-col items-center gap-0.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0}>
                  {/* A div with inline colors: the panel's theme recolors spans and Tailwind background classes. */}
                  <div
                    data-keep-bg
                    className={cn('h-3.5 w-3.5 rounded-full border-2', !month && 'animate-pulse')}
                    style={month ? STATE_STYLE[month.state] : LOADING_STYLE}
                  />
                  <span className="sr-only">{`${monthFullLabel(key)}: ${status} ${amounts}`}</span>
                  {showLabels && <span className="text-[0.625rem] leading-none text-muted-foreground">{monthShortLabel(key)}</span>}
                </div>
              </TooltipTrigger>
              {/* Inside a table row, whose styles clear div backgrounds: keep this one. */}
              <TooltipContent side="top" className="text-xs" data-keep-bg style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <div className="font-semibold">{monthFullLabel(key)}</div>
                <div>{status}</div>
                {amounts && <div className="tabular-nums">{amounts}</div>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
