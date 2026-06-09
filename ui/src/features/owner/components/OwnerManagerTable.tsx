// Source file for the components area in the owner feature.

import { BarChart3, KeyRound, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getOwnerManagerRowId } from '../utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { OwnerManagerColumnDef, OwnerManagerTabType } from '../types';

interface OwnerManagerTableProps {
  activeTab: OwnerManagerTabType;
  columns: OwnerManagerColumnDef[];
  data: any[];
  loading: boolean;
  showForm: boolean;
  isScopedAndMissingCenter: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onResetPassword: (item: any) => void;
}

// Renders status badge.
const renderStatusBadge = (status: any, t: (value: string) => string) => {
  const value = String(status || '').trim();
  if (!value) return <span className="text-muted-foreground">-</span>;

  const normalized = value.toLowerCase();
  const tone =
    normalized === 'active'
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      : normalized === 'inactive'
        ? 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        : normalized === 'graduated'
          ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
          : normalized === 'removed'
            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            : normalized === 'suspended' || normalized === 'retired'
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              : 'bg-sky-500/10 text-sky-500 border-sky-500/20';

  return (
    <Badge variant="outline" className={cn('font-medium', tone)}>
      {t(value)}
    </Badge>
  );
};

// Renders the owner manager table module.
export const OwnerManagerTable = ({
  activeTab,
  columns,
  data,
  loading,
  showForm,
  isScopedAndMissingCenter,
  onEdit,
  onDelete,
  onResetPassword,
}: OwnerManagerTableProps) => {
  const { t } = useLanguage();

  return (
    <Card className="border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:shadow-black/10">
      <CardContent className="space-y-4 p-0">
        {loading && !showForm ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500 dark:text-white/50">
            <div className="rounded-full border border-slate-200/70 bg-slate-100/70 p-4 dark:border-white/10 dark:bg-white/5">
              <BarChart3 className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-slate-800 dark:text-white/80">{t('No data in this view')}</p>
              <p className="text-sm">{isScopedAndMissingCenter ? t('Choose a branch to load this section.') : t('Add the first item when you are ready.')}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200/70 bg-slate-100/80 hover:bg-slate-100/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/5">
                  {columns.map((column) => (
                    <TableHead key={column.key} className="whitespace-nowrap font-semibold text-slate-600 dark:text-white/70">
                      {t(column.label)}
                    </TableHead>
                  ))}
                  <TableHead className="w-[120px] text-right font-semibold text-slate-600 dark:text-white/70">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const rowId = getOwnerManagerRowId(item);
                  return (
                    <TableRow key={rowId} className="border-slate-200/60 hover:bg-slate-100/70 dark:border-white/5 dark:hover:bg-white/5">
                      {columns.map((column) => (
                        <TableCell key={column.key} className="whitespace-nowrap text-slate-800 dark:text-white/85">
                          {column.render
                            ? column.render(item)
                            : column.key === 'status'
                              ? renderStatusBadge(item[column.key], t)
                              : String(item[column.key] ?? '-')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {(activeTab === 'teachers' || activeTab === 'students') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onResetPassword(item)}
                              disabled={loading}
                              className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                              title={t('Reset password')}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            className="text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                            title={t('Edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(Number(rowId))}
                            className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                            title={t('Delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
