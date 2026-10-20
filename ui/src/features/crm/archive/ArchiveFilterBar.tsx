import { CalendarRange, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/i18n/LanguageContext';
import { ALL, isFiltered, type ArchiveFilterState, type FilterOption } from './archiveFilters';

type Props = {
  filters: ArchiveFilterState;
  onChange: (filters: ArchiveFilterState) => void;
  searchPlaceholder: string;
  selects: Array<{ key: string; label: string; options: FilterOption[] }>;
  dateLabel: string;
  shown: number;
  total: number;
};

// Search on top; the filters for the tab and the date range below; how many rows match and a
// clear button on the right.
export function ArchiveFilterBar({ filters, onChange, searchPlaceholder, selects, dateLabel, shown, total }: Props) {
  const { t } = useLanguage();
  const set = (patch: Partial<ArchiveFilterState>) => onChange({ ...filters, ...patch });
  // A filter with a single choice filters nothing, so it is not shown (unless it is in use).
  const visibleSelects = selects.filter((select) => select.options.length > 1 || (filters.selects[select.key] && filters.selects[select.key] !== ALL));

  return (
    <div className="space-y-3 border-b bg-slate-50/60 p-3 dark:bg-muted/20">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(event) => set({ q: event.target.value })}
            placeholder={searchPlaceholder}
            aria-label={t('Search')}
            className="h-9 bg-white pl-9 dark:bg-background"
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground" aria-live="polite">
          {t('{shown} of {total}', { shown, total })}
        </span>
        {isFiltered(filters) && (
          <Button type="button" variant="ghost" size="sm" className="h-9" onClick={() => onChange({ q: '', from: '', to: '', selects: {} })}>
            <X className="mr-1.5 h-4 w-4" />
            {t('Clear filters')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {visibleSelects.map((select) => (
          <div key={select.key} className="space-y-1">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-muted-foreground">{select.label}</span>
            <Select value={filters.selects[select.key] || ALL} onValueChange={(value) => set({ selects: { ...filters.selects, [select.key]: value } })}>
              <SelectTrigger className="h-9 bg-white dark:bg-background" aria-label={select.label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('All')}</SelectItem>
                {select.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <div className="space-y-1 sm:col-span-2">
          <span className="flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-wide text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            {dateLabel}
          </span>
          <div className="flex items-center gap-2">
            <Input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => set({ from: event.target.value })} aria-label={t('From date')} className="h-9 bg-white dark:bg-background" />
            <span className="text-muted-foreground">–</span>
            <Input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => set({ to: event.target.value })} aria-label={t('To date')} className="h-9 bg-white dark:bg-background" />
          </div>
        </div>
      </div>
    </div>
  );
}
