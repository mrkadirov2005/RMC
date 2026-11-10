import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatMoney, formatMonth, type PriceHistoryEntry } from '../priceHistory';

/** A price history (a group's or a level's), newest first. */
export const PriceHistoryTable = ({ items }: { items: PriceHistoryEntry[] }) => {
  const { t } = useLanguage();
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">{t('From month')}</TableHead>
            <TableHead className="text-xs">{t('Price')}</TableHead>
            <TableHead className="text-xs">{t('Previous price')}</TableHead>
            <TableHead className="text-xs">{t('Changed by')}</TableHead>
            <TableHead className="text-xs">{t('Note')}</TableHead>
            <TableHead className="text-xs">{t('Saved')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const initial = entry.source === 'initial';
            return (
              <TableRow key={entry.history_id}>
                <TableCell className="text-xs font-semibold">
                  {initial ? t('Before the first change') : formatMonth(entry.effective_from)}
                </TableCell>
                <TableCell className="text-xs font-bold">{formatMoney(entry.amount)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {entry.previous_amount == null ? '—' : formatMoney(entry.previous_amount)}
                </TableCell>
                <TableCell className="text-xs">{entry.changed_by_name || '—'}</TableCell>
                <TableCell className="max-w-[240px] truncate text-xs" title={entry.note || ''}>
                  {initial ? '—' : entry.note || '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {initial ? '—' : new Date(entry.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
