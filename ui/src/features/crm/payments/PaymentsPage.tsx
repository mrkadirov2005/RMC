// Page component for the payments screen in the crm feature.

import { useEffect } from 'react';
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
import { PaymentFormDialog } from './components/PaymentFormDialog';

// Renders the payments page screen.
const PaymentsPage = () => {
  const { t } = useLanguage();
  const hook = usePaymentsPage();

  const {
    isTeacher,
    state,
    selectedFolder,
    teacherDetailView,
    viewMode,
    setViewMode,
    isImporting,
    fileInputRef,
    isModalOpen,
    formData,
    setFormData,
    studentOptions,
    centerOptions,
    isLoadingOptions,
    classes,
    students,
    overallPaymentStats,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleImportPayments,
    handleExportPayments,
    handleBackToFolders,
  } = hook;

  const selectedStudent = students.find(
    (student) => Number(student.student_id || student.id || 0) === Number(formData.student_id || 0)
  );
  const selectedClass = classes.find(
    (classItem) => Number(classItem.class_id || classItem.id || 0) === Number(selectedStudent?.class_id || 0)
  );

  useEffect(() => {
    if (!selectedStudent) return;

    setFormData((current) => {
      let changed = false;
      const next = { ...current };

      if ((!current.amount || Number(current.amount) === 0) && selectedClass?.payment_amount) {
        next.amount = Number(selectedClass.payment_amount);
        changed = true;
      }

      if ((!current.center_id || Number(current.center_id) === 0) && selectedStudent.center_id) {
        next.center_id = Number(selectedStudent.center_id);
        changed = true;
      }

      return changed ? next : current;
    });
  }, [selectedClass?.payment_amount, selectedStudent, setFormData]);

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

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <MetricCard className="rounded-md p-2 [&_p]:text-[10px] [&_div.mt-1]:mt-0 [&_div.text-2xl]:text-lg [&_div.text-xs]:text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_.h-9]:h-7 [&_.w-9]:w-7" label="Payment Records" value={overallPaymentStats.totalPayments} detail="All visible records" icon={ReceiptText} tone="green" />
        <MetricCard className="rounded-md p-2 [&_p]:text-[10px] [&_div.mt-1]:mt-0 [&_div.text-2xl]:text-lg [&_div.text-xs]:text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_.h-9]:h-7 [&_.w-9]:w-7" label="Total Amount" value={formatMoney(overallPaymentStats.totalAmount)} detail="Across current scope" icon={DollarSign} tone="blue" />
        <MetricCard className="rounded-md p-2 [&_p]:text-[10px] [&_div.mt-1]:mt-0 [&_div.text-2xl]:text-lg [&_div.text-xs]:text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_.h-9]:h-7 [&_.w-9]:w-7" label="Paid Share" value={`${overallPaymentStats.paidPercent}%`} detail="Completed payments" icon={TrendingUp} tone="neutral" />
        <MetricCard className="rounded-md p-2 [&_p]:text-[10px] [&_div.mt-1]:mt-0 [&_div.text-2xl]:text-lg [&_div.text-xs]:text-[10px] [&_svg]:h-3 [&_svg]:w-3 [&_.h-9]:h-7 [&_.w-9]:w-7" label="Collected" value={formatMoney(overallPaymentStats.paidAmount)} detail="Completed amount" icon={ShieldCheck} tone="amber" />
      </div>

      {!selectedFolder ? (
        <PaymentsFolderTabs hook={hook} />
      ) : selectedFolder.type === 'teacher' ? (
        <PaymentTeacherDetail hook={hook} />
      ) : (
        <PaymentListView hook={hook} />
      )}

      {!isTeacher && (
        <PaymentFormDialog
          open={isModalOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseModal();
          }}
          title={formData.payment_id || formData.id ? 'Edit Payment' : 'Add Payment'}
          description="Create or update a payment from one structured modal instead of leaving the page."
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isSubmitting={state.loading}
          submitLabel={formData.payment_id || formData.id ? 'Update payment' : 'Save payment'}
          studentOptions={studentOptions}
          centerOptions={centerOptions}
          isLoadingOptions={isLoadingOptions}
          showStudentSelect
          showCenterSelect={Boolean(centerOptions.length)}
          selectedStudent={
            selectedStudent
              ? {
                  name: `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim(),
                  subtitle: `ID ${selectedStudent.student_id || selectedStudent.id || ''}${selectedStudent.phone ? ` / ${selectedStudent.phone}` : ''}`,
                  className: selectedClass?.class_name || selectedStudent.class_name || undefined,
                  amount: selectedClass?.payment_amount,
                }
              : null
          }
          amountHint={
            selectedClass?.payment_amount
              ? `Suggested from ${selectedClass.class_name || 'selected class'} fee: ${formatMoney(
                  Number(selectedClass.payment_amount || 0)
                )}`
              : undefined
          }
          submitDisabled={!formData.student_id}
        />
      )}

    </div>
  );
};

export default PaymentsPage;
