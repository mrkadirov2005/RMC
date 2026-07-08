// Page component for the payments screen in the crm feature.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  DollarSign,
  Loader2,
  Wallet,
  ReceiptText,
  TrendingUp,
  ShieldCheck,
  Upload,
  Download,
} from 'lucide-react';
import { ViewModeToggle } from '@/components/common/ViewModeToggle';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePaymentsPage } from './hooks/usePaymentsPage';
import { PaymentsFolderTabs } from './components/PaymentsFolderTabs';
import { PaymentTeacherDetail } from './components/PaymentTeacherDetail';
import { PaymentListView } from './components/PaymentListView';
import { PaymentGroupsMatrixTab } from './components/PaymentGroupsMatrixTab';

// Renders the payments page screen.
const PaymentsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const hook = usePaymentsPage();
  const [paymentsView, setPaymentsView] = useState('folders');

  const {
    isTeacher,
    state,
    selectedFolder,
    teacherDetailView,
    viewMode,
    setViewMode,
    isImporting,
    fileInputRef,
    overallPaymentStats,
    handleImportPayments,
    handleExportPayments,
    handleBackToFolders,
  } = hook;

  const pageTitle = !selectedFolder
    ? 'Payments Management'
    : selectedFolder.type === 'teacher'
      ? `${selectedFolder.name} - ${teacherDetailView === 'groups' ? 'Groups' : 'Total'}`
      : `${selectedFolder.name} - Payments`;

  return (
    <div className="container mx-auto space-y-6">
      <PageHeader
        title={pageTitle}
        description="Organize payments by student, class, teacher, and collection status."
        icon={Wallet}
        actions={
          <>
            {selectedFolder && (
              <Button variant="outline" size="sm" onClick={handleBackToFolders}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            {!isTeacher && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => handleImportPayments(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {isImporting ? t('Importing...') : t('Import CSV')}
                </Button>
                <Button type="button" variant="outline" onClick={handleExportPayments}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('Export CSV')}
                </Button>
                <Button onClick={() => navigate('/payments/new')}>
                  <Plus className="mr-2 h-4 w-4" /> Add Payment
                </Button>
              </>
            )}
          </>
        }
      />

      {isTeacher && (
        <Alert className="mb-4">
          <AlertDescription>
            Teacher view is limited to payment status only.
          </AlertDescription>
        </Alert>
      )}

      {state.error && (
        <Alert className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <MetricCard className="rounded-md p-2 [&_p]:text-[10px] [&_div.mt-1]:mt-0 [&_div.text-2xl]:text-lg [&_div.text-xs]:text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_.h-9]:h-7 [&_.w-9]:w-7" label="Payment Records" value={overallPaymentStats.totalPayments} detail="All visible records" icon={ReceiptText} tone="green" />
        <MetricCard className="rounded-md p-2 [&_p]:text-[10px] [&_div.mt-1]:mt-0 [&_div.text-2xl]:text-lg [&_div.text-xs]:text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_.h-9]:h-7 [&_.w-9]:w-7" label="Total Amount" value={formatMoney(overallPaymentStats.totalAmount)} detail="Across current scope" icon={DollarSign} tone="blue" />
        <MetricCard className="rounded-md p-2 [&_p]:text-[10px] [&_div.mt-1]:mt-0 [&_div.text-2xl]:text-lg [&_div.text-xs]:text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_.h-9]:h-7 [&_.w-9]:w-7" label="Paid Share" value={`${overallPaymentStats.paidPercent}%`} detail="Completed payments" icon={TrendingUp} tone="neutral" />
        <MetricCard className="rounded-md p-2 [&_p]:text-[10px] [&_div.mt-1]:mt-0 [&_div.text-2xl]:text-lg [&_div.text-xs]:text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_.h-9]:h-7 [&_.w-9]:w-7" label="Collected" value={formatMoney(overallPaymentStats.paidAmount)} detail="Completed amount" icon={ShieldCheck} tone="amber" />
      </div>

      {!selectedFolder ? (
        <Tabs value={paymentsView} onValueChange={setPaymentsView} className="space-y-4">
          <TabsList className="bg-slate-100/80 dark:bg-muted">
            <TabsTrigger value="folders">{t('Folders')}</TabsTrigger>
            <TabsTrigger value="groups">{t('Group payments')}</TabsTrigger>
          </TabsList>
          <TabsContent value="folders" className="mt-0">
            <PaymentsFolderTabs hook={hook} />
          </TabsContent>
          <TabsContent value="groups" className="mt-0">
            <PaymentGroupsMatrixTab />
          </TabsContent>
        </Tabs>
      ) : selectedFolder.type === 'teacher' ? (
        <PaymentTeacherDetail hook={hook} />
      ) : (
        <PaymentListView hook={hook} />
      )}

    </div>
  );
};

export default PaymentsPage;
