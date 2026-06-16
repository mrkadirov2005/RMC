import { AlertTriangle, CheckCircle, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Payment } from '../types';

interface StudentPaymentHistoryProps {
  months: Date[];
  payments: Payment[];
  language: string;
  t: (value: string) => string;
}

export const StudentPaymentHistory = ({ months, payments, language, t }: StudentPaymentHistoryProps) => (
  <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3b0f25] via-[#9f1239] to-[#f97316] text-white shadow-lg shadow-orange-200/45 animate-fade-in animation-delay-400">
    <CardHeader className="border-b border-white/12 pb-4">
      <CardTitle className="flex items-center gap-2 text-base text-white">
        <div className="rounded-md bg-amber-300 p-2 text-[#3b0f25]">
          <Wallet className="h-5 w-5" />
        </div>
        {t('Payment History')}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-6">
      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {months.map((monthDate) => (
          <PaymentMonth key={monthDate.toISOString()} monthDate={monthDate} payments={payments} language={language} t={t} />
        ))}
      </div>
    </CardContent>
  </Card>
);

const PaymentMonth = ({
  monthDate,
  payments,
  language,
  t,
}: {
  monthDate: Date;
  payments: Payment[];
  language: string;
  t: (value: string) => string;
}) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth() + 1;
  const hasPaid = payments.some((payment) => {
    if (payment.payment_status?.toLowerCase() !== 'completed' && payment.status?.toLowerCase() !== 'completed') return false;
    const paymentDate = new Date(payment.payment_date || '');
    return paymentDate.getFullYear() === year && paymentDate.getMonth() + 1 === month;
  });
  const locale = language === 'uz' ? 'uz-UZ' : 'en-US';
  const monthName = monthDate.toLocaleString(locale, { month: 'short' });
  const yearName = monthDate.toLocaleString(locale, { year: '2-digit' });

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border p-4 transition-colors',
        hasPaid ? 'border-emerald-200/35 bg-emerald-300/18' : 'border-amber-200/35 bg-white/14'
      )}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-white/70">{monthName} '{yearName}</span>
      <div className="mb-2 mt-3">
        {hasPaid ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300 text-[#064e3b]">
            <CheckCircle className="h-5 w-5" />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 text-[#4a2100]">
            <AlertTriangle className="h-5 w-5" />
          </div>
        )}
      </div>
      <span className={cn('text-xs font-bold', hasPaid ? 'text-emerald-100' : 'text-amber-100')}>
        {hasPaid ? t('Settled') : t('Unpaid')}
      </span>
    </div>
  );
};
