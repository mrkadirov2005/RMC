import {
  Pencil,
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
import { useNavigate } from 'react-router-dom';
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

interface PaymentListViewProps {
  hook: UsePaymentsPageReturn;
}

export const PaymentListView = ({ hook }: PaymentListViewProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
    getStudentName,
    getStatusBadgeClasses,
  } = hook;

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
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/payments/${payment.payment_id || payment.id}/edit`)}>
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
