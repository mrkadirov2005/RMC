// Source file for the components area in the owner feature.

import { BarChart3, KeyRound, Loader2, Pencil, ShieldX, Trash2 } from 'lucide-react';
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
  onHardDelete: (id: number) => void;
  onResetPassword: (item: any) => void;
  canHardDelete: boolean;
}

// Renders status badge.
const renderStatusBadge = (status: any, t: (value: string) => string) => {
  const value = String(status || '').trim();
  if (!value) return <span className="text-muted-foreground">-</span>;

  const normalized = value.toLowerCase();
  const tone =
    normalized === 'active'
      ? 'bg-emerald-600 text-white border-emerald-600'
      : normalized === 'inactive'
        ? 'bg-slate-600 text-white border-slate-600'
        : normalized === 'graduated'
          ? 'bg-indigo-600 text-white border-indigo-600'
          : normalized === 'removed'
            ? 'bg-rose-600 text-white border-rose-600'
            : normalized === 'suspended' || normalized === 'retired'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-sky-600 text-white border-sky-600';

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
  onHardDelete,
  onResetPassword,
  canHardDelete,
}: OwnerManagerTableProps) => {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden rounded-md border-slate-200/80 bg-white shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:shadow-black/10">
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
                <TableRow className="border-slate-200/70 bg-slate-100/90 hover:bg-slate-100/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/5">
                  {columns.map((column) => (
                    <TableHead key={column.key} className="h-9 whitespace-nowrap text-xs font-black text-slate-600 dark:text-white/70">
                      {t(column.label)}
                    </TableHead>
                  ))}
                  <TableHead className="h-9 w-[120px] text-right text-xs font-black text-slate-600 dark:text-white/70">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const rowId = getOwnerManagerRowId(item);
                  return (
                    <TableRow key={rowId} className="border-slate-200/60 text-xs hover:bg-cyan-50/70 dark:border-white/5 dark:hover:bg-white/5">
                      {columns.map((column) => (
                        <TableCell key={column.key} className="whitespace-nowrap py-1.5 font-semibold text-slate-800 dark:text-white/85">
                          {column.render
                            ? column.render(item)
                            : column.key === 'status'
                              ? renderStatusBadge(item[column.key], t)
                              : String(item[column.key] ?? '-')}
                        </TableCell>
                      ))}
                      <TableCell className="py-1.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {(activeTab === 'teachers' || activeTab === 'students') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onResetPassword(item)}
                              disabled={loading}
                              className="h-7 w-7 rounded bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white"
                              title={t('Reset password')}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            className="h-7 w-7 rounded bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white"
                            title={t('Edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(Number(rowId))}
                            className="h-7 w-7 rounded bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white"
                            title={t('Delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {canHardDelete && (activeTab === 'teachers' || activeTab === 'students') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onHardDelete(Number(rowId))}
                              className="h-7 w-7 rounded bg-red-100 text-red-700 hover:bg-red-700 hover:text-white"
                              title={t('Hard delete')}
                            >
                              <ShieldX className="h-4 w-4" />
                            </Button>
                          )}
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
