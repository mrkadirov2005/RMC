import { useMemo, useState } from 'react';
import {
  BadgePercent,
  CalendarDays,
  Pencil,
  ReceiptText,
  Trash2,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SimplePaginationBar } from '@/components/common/SimplePaginationBar';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { paymentMethodOptions, paymentStatusOptions } from '../../../../utils/dropdownOptions';
import type { UsePaymentsPageReturn } from '../hooks/usePaymentsPage';

const paymentSurfaceClass =
  'overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm';

const formatAmount = (amount: number) => Number(amount || 0).toLocaleString();

interface PaymentListViewProps {
  hook: UsePaymentsPageReturn;
}

export const PaymentListView = ({ hook }: PaymentListViewProps) => {
  const { t } = useLanguage();
  const {
    dispatch,
    setPaymentsSearchTerm,
    setPaymentsFilterStatus,
    setPaymentsFilterMethod,
    setPaymentsShowFilters,
    isTeacher,
    state,
    searchTerm,
    filterStatus,
    filterMethod,
    showFilters,
    hasActiveFilters,
    displayedPayments,
    paginatedDisplayedPayments,
    totalAmount,
    displayedPendingAmount,
    setPaymentsPage,
    paymentsPageSize,
    setPaymentsPageSize,
    paymentPageSizeOptions,
    clearFilters,
    handleDelete,
    handleOpenModal,
    getStudentName,
    getStatusBadgeClasses,
    selectedFolder,
    students,
    classes,
  } = hook;

  const [groupPaymentFilter, setGroupPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [paymentHistoryRow, setPaymentHistoryRow] = useState<null | {
    name: string;
    payments: typeof state.items;
  }>(null);
  const [groupPaymentMonth, setGroupPaymentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const selectedGroupClass = selectedFolder?.type === 'class'
    ? classes.find((item) => Number(item.class_id || item.id) === Number(selectedFolder.id))
    : undefined;

  const groupStudentRows = useMemo(() => {
    if (selectedFolder?.type !== 'class') return [];
    const expectedAmount = Number(selectedGroupClass?.payment_amount || 0);
    const search = searchTerm.trim().toLowerCase();

    return students
      .filter((student) => Number(student.class_id || 0) === Number(selectedFolder.id))
      .map((student) => {
        const studentId = Number(student.student_id || student.id || 0);
        const studentPayments = state.items.filter((payment) => {
          if (Number(payment.student_id) !== studentId) return false;
          if (!payment.payment_date || String(payment.payment_date).slice(0, 7) !== groupPaymentMonth) return false;
          const status = String(payment.status || payment.payment_status || '').toLowerCase();
          return status === 'completed' || status === 'paid';
        });
        const paidAmount = studentPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        const discountAmount = Math.max(0, ...studentPayments.map((payment) => Number(payment.discount_amount || 0)));
        const discountedExpectedAmount = Math.max(0, expectedAmount - discountAmount);
        const paymentState = paidAmount <= 0 ? 'unpaid' : discountedExpectedAmount > 0 && paidAmount < discountedExpectedAmount ? 'partial' : 'paid';
        const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || `Student #${studentId}`;
        return {
          student,
          studentId,
          name,
          payments: studentPayments,
          paidAmount,
          expectedAmount,
          discountAmount,
          remainingAmount: Math.max(0, discountedExpectedAmount - paidAmount),
          paymentState,
          lastPaymentDate: studentPayments
            .map((payment) => String(payment.payment_date || ''))
            .sort((a, b) => b.localeCompare(a))[0] || '',
        };
      })
      .filter((row) => !search || row.name.toLowerCase().includes(search))
      .filter((row) => groupPaymentFilter === 'all' || (groupPaymentFilter === 'paid' ? row.paymentState === 'paid' : row.paymentState !== 'paid'));
  }, [groupPaymentFilter, groupPaymentMonth, searchTerm, selectedFolder, selectedGroupClass, state.items, students]);

  if (selectedFolder?.type === 'class') {
    const paidCount = groupStudentRows.filter((row) => row.paymentState === 'paid').length;
    const totalPaid = groupStudentRows.reduce((sum, row) => sum + row.paidAmount, 0);
    const totalRemaining = groupStudentRows.reduce((sum, row) => sum + row.remainingAmount, 0);

    return (
      <div className="space-y-4">
        <Card className={paymentSurfaceClass}>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-white">
                <p className="text-[11px] text-white/70">Students shown</p>
                <p className="text-base font-bold">{groupStudentRows.length} · {paidCount} paid</p>
              </div>
              <div className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-2 text-white">
                <p className="text-[11px] text-white/70">Collected</p>
                <p className="text-base font-bold">{formatAmount(totalPaid)}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-white">
                <p className="text-[11px] text-white/70">Remaining</p>
                <p className="text-base font-bold">{formatAmount(totalRemaining)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-border dark:bg-muted/30">
              <ReceiptText className="h-4 w-4 text-slate-500" />
              <span className="text-muted-foreground">Monthly group fee:</span>
              <span className="font-bold text-slate-900 dark:text-foreground">
                {formatAmount(Number(selectedGroupClass?.payment_amount || 0))}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => dispatch(setPaymentsSearchTerm(event.target.value))}
                  placeholder="Search students in this group..."
                  className="pl-10"
                />
              </div>
              <Input type="month" value={groupPaymentMonth} onChange={(event) => event.target.value && setGroupPaymentMonth(event.target.value)} />
              <Select value={groupPaymentFilter} onValueChange={(value) => setGroupPaymentFilter(value as 'all' | 'paid' | 'unpaid')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  <SelectItem value="paid">Payment done</SelectItem>
                  <SelectItem value="unpaid">Payment undone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className={cn(paymentSurfaceClass, 'overflow-x-auto rounded-lg px-4 [&_th]:h-9 [&_th]:px-3 [&_td]:px-3 [&_td]:py-1.5')}>
          <Table className="mx-auto min-w-[720px] max-w-4xl table-auto text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-center">Payments</TableHead>
                <TableHead>Payment date</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.loading ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center">Loading...</TableCell></TableRow>
              ) : groupStudentRows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No students match this filter.</TableCell></TableRow>
              ) : groupStudentRows.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell>
                    <p className="truncate font-semibold leading-tight">{row.name}</p>
                    <p className="truncate text-[11px] leading-tight text-muted-foreground">{row.student.phone || `ID ${row.studentId}`}</p>
                    {row.discountAmount > 0 && (
                      <Badge variant="outline" className="mt-0.5 h-5 gap-1 px-1.5 text-[10px] border-violet-200 bg-violet-50 text-violet-700">
                        <BadgePercent className="h-3 w-3" />
                        Discount {formatAmount(row.discountAmount)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.payments.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 font-semibold text-blue-700 hover:text-blue-800"
                        onClick={() => setPaymentHistoryRow({ name: row.name, payments: row.payments })}
                      >
                        <ReceiptText className="h-4 w-4" />
                        {row.payments.length}
                      </Button>
                    ) : <span className="text-muted-foreground">0</span>}
                  </TableCell>
                  <TableCell>{row.lastPaymentDate ? new Date(`${row.lastPaymentDate.slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-right font-semibold text-rose-600">{formatAmount(row.remainingAmount)}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">{formatAmount(row.paidAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={Boolean(paymentHistoryRow)} onOpenChange={(open) => !open && setPaymentHistoryRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Payment history</DialogTitle>
              <DialogDescription>
                {paymentHistoryRow?.name} · {groupPaymentMonth}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[360px] space-y-2 overflow-y-auto">
              {[...(paymentHistoryRow?.payments || [])]
                .sort((a, b) => String(b.payment_date || '').localeCompare(String(a.payment_date || '')))
                .map((payment, index) => (
                  <div
                    key={payment.payment_id || payment.id || `${payment.payment_date}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {payment.payment_date ? new Date(`${String(payment.payment_date).slice(0, 10)}T00:00:00`).toLocaleDateString() : 'Date unavailable'}
                        </p>
                        <p className="text-xs text-muted-foreground">{payment.payment_method || 'Payment'}</p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-700">{formatAmount(Number(payment.amount || 0))}</p>
                  </div>
                ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <Card className={paymentSurfaceClass}>
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 dark:hidden" />
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-white">
              <p className="text-[11px] text-white/70">{t('Visible Records')}</p>
              <p className="text-base font-bold">{displayedPayments.length}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-2 text-white">
              <p className="text-[11px] text-white/70">{t('Visible Total')}</p>
              <p className="text-base font-bold">{formatMoney(totalAmount)}</p>
            </div>
            <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-white">
              <p className="text-[11px] text-white/70">{t('Pending or Unpaid')}</p>
              <p className="text-base font-bold">{formatMoney(displayedPendingAmount)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('Search by student, receipt, reference...')}
                value={searchTerm}
                onChange={(e) => dispatch(setPaymentsSearchTerm(e.target.value))}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                  onClick={() => dispatch(setPaymentsSearchTerm(''))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => dispatch(setPaymentsShowFilters(!showFilters))}
            >
              <Filter className="mr-2 h-4 w-4" />
              {t('Filters')}
              {hasActiveFilters && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {(filterStatus ? 1 : 0) + (filterMethod ? 1 : 0)}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> {t('Clear All')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/20 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('Payment Status')}</Label>
            <Select value={filterStatus} onValueChange={(value) => dispatch(setPaymentsFilterStatus(value))}>
              <SelectTrigger>
                <SelectValue placeholder={t('All Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('All Status')}</SelectItem>
                {paymentStatusOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isTeacher && (
            <div className="space-y-2">
              <Label>{t('Payment Method')}</Label>
              <Select value={filterMethod} onValueChange={(value) => dispatch(setPaymentsFilterMethod(value))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('All Methods')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('All Methods')}</SelectItem>
                  {paymentMethodOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Payments Table */}
      <div className={cn(paymentSurfaceClass, 'rounded-lg [&_table]:text-xs [&_th]:text-xs [&_td]:py-2')}>
        <Table>
          <TableHeader>
            <TableRow>
              {!isTeacher && <TableHead>{t('Receipt #')}</TableHead>}
              <TableHead>{t('Student')}</TableHead>
              <TableHead>{t('Date')}</TableHead>
              {!isTeacher && <TableHead>{t('Amount')}</TableHead>}
              {!isTeacher && <TableHead>{t('Method')}</TableHead>}
              {!isTeacher && <TableHead>{t('Type')}</TableHead>}
              <TableHead>{t('Status')}</TableHead>
              {!isTeacher && <TableHead className="w-24">{t('Actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.loading ? (
              <TableRow>
                <TableCell colSpan={isTeacher ? 4 : 8} className="text-center py-6">{t('Loading...')}</TableCell>
              </TableRow>
            ) : displayedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isTeacher ? 4 : 8} className="text-center py-6 text-muted-foreground">
                  {hasActiveFilters ? t('No payments match your criteria') : t('No payments found')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedDisplayedPayments.items.map((payment) => (
                <TableRow key={payment.payment_id || payment.id}>
                  {!isTeacher && (
                    <TableCell className="font-mono">{payment.receipt_number}</TableCell>
                  )}
                  <TableCell>{getStudentName(payment.student_id)}</TableCell>
                  <TableCell>
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '—'}
                  </TableCell>
                  {!isTeacher && (
                    <TableCell className="font-semibold">
                      {formatMoney(payment.amount || 0)}
                    </TableCell>
                  )}
                  {!isTeacher && <TableCell>{payment.payment_method}</TableCell>}
                  {!isTeacher && <TableCell>{payment.payment_type}</TableCell>}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeClasses(payment.status || payment.payment_status || 'Pending')}
                    >
                      {payment.status || payment.payment_status || 'Pending'}
                    </Badge>
                  </TableCell>
                  {!isTeacher && (
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(payment)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.payment_id || payment.id || 0)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <SimplePaginationBar
        total={displayedPayments.length}
        currentPage={paginatedDisplayedPayments.currentPage}
        totalPages={paginatedDisplayedPayments.totalPages}
        start={paginatedDisplayedPayments.start}
        end={paginatedDisplayedPayments.end}
        pageSize={paymentsPageSize}
        pageSizeOptions={paymentPageSizeOptions}
        onPageChange={setPaymentsPage}
        onPageSizeChange={(value) => {
          setPaymentsPageSize(value);
          setPaymentsPage(1);
        }}
      />
    </>
  );
};
