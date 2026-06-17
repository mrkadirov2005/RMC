// Page component for the payments screen in the crm feature.

import { lazy, Suspense } from 'react';
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
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePaymentsPage } from './hooks/usePaymentsPage';
import { PaymentsFolderTabs } from './components/PaymentsFolderTabs';
import { PaymentTeacherDetail } from './components/PaymentTeacherDetail';
import { PaymentListView } from './components/PaymentListView';

const PaymentFormDialog = lazy(() => import('./components/PaymentFormDialog'));

// Renders the payments page screen.
const PaymentsPage = () => {
  const { t } = useLanguage();
  const hook = usePaymentsPage();

  const {
    isTeacher,
    isOwner,
    state,
    selectedFolder,
    isModalOpen,
    editingId,
    teacherDetailView,
    viewMode,
    setViewMode,
    isImporting,
    fileInputRef,
    overallPaymentStats,
    studentOptions,
    centerOptions,
    isLoadingOptions,
    formData,
    setFormData,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
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
                <Button onClick={() => handleOpenModal()}>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Payment Records" value={overallPaymentStats.totalPayments} detail="All visible records" icon={ReceiptText} tone="green" />
        <MetricCard label="Total Amount" value={formatMoney(overallPaymentStats.totalAmount)} detail="Across current scope" icon={DollarSign} tone="blue" />
        <MetricCard label="Paid Share" value={`${overallPaymentStats.paidPercent}%`} detail="Completed payments" icon={TrendingUp} tone="neutral" />
        <MetricCard label="Collected" value={formatMoney(overallPaymentStats.paidAmount)} detail="Completed amount" icon={ShieldCheck} tone="amber" />
      </div>

      {!selectedFolder ? (
        <PaymentsFolderTabs hook={hook} />
      ) : selectedFolder.type === 'teacher' ? (
        <PaymentTeacherDetail hook={hook} />
      ) : (
        <PaymentListView hook={hook} />
      )}

      <Suspense fallback={null}>
        <PaymentFormDialog
          open={isModalOpen}
          editingId={editingId}
          loading={state.loading}
          isOwner={isOwner}
          centerOptions={centerOptions}
          studentOptions={studentOptions}
          isLoadingOptions={isLoadingOptions}
          formData={formData}
          setFormData={setFormData}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
        />
      </Suspense>
    </div>
  );
};

export default PaymentsPage;
