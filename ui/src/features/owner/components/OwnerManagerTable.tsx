// Source file for the components area in the owner feature.

import { Database, KeyRound, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getOwnerManagerRowId } from '../utils';
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
const renderStatusBadge = (status: any) => {
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
      {value}
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
  return (
    <Card className="border-white/10 bg-white/[0.03] shadow-xl shadow-black/10 backdrop-blur">
      <CardContent className="space-y-4 p-0">
        {loading && !showForm ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-white/50">
            <div className="rounded-full border border-white/10 bg-white/5 p-4">
              <Database className="h-6 w-6 text-amber-300" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium text-white/80">No records found</p>
              <p className="text-sm">{isScopedAndMissingCenter ? 'Choose a branch to load data.' : 'Use the Add button to create the first record.'}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-white/5 hover:bg-white/5">
                  {columns.map((column) => (
                    <TableHead key={column.key} className="whitespace-nowrap font-semibold text-white/70">
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-[120px] text-right font-semibold text-white/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  const rowId = getOwnerManagerRowId(item);
                  return (
                    <TableRow key={rowId} className="border-white/5 hover:bg-white/5">
                      {columns.map((column) => (
                        <TableCell key={column.key} className="whitespace-nowrap text-white/85">
                          {column.render
                            ? column.render(item)
                            : column.key === 'status'
                              ? renderStatusBadge(item[column.key])
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
                              className="text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
                              title="Reset password"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            className="text-sky-300 hover:bg-sky-400/10 hover:text-sky-200"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(Number(rowId))}
                            className="text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"
                            title="Delete"
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
