import {
  Folder,
  DollarSign,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SimplePaginationBar } from '@/components/common/SimplePaginationBar';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import type { UsePaymentsPageReturn } from '../hooks/usePaymentsPage';

const paymentSurfaceClass =
  'overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm';

const folderCardClass =
  'cursor-pointer overflow-hidden border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card dark:hover:shadow-sm [&_.folder-card-content]:p-3';

interface PaymentTeacherDetailProps {
  hook: UsePaymentsPageReturn;
}

export const PaymentTeacherDetail = ({ hook }: PaymentTeacherDetailProps) => {
  const { t } = useLanguage();
  const {
    selectedFolder,
    teacherDetailView,
    setTeacherDetailView,
    selectedTeacherClasses,
    paginatedSelectedTeacherClasses,
    selectedTeacherStats,
    selectedTeacherProgress,
    loadingData,
    folderGridClass,
    folderPageSizeOptions,
    setFolderPage,
    folderPageSize,
    setFolderPageSize,
    getPaymentCountForClass,
    getTotalAmountForClass,
    handleFolderClick,
  } = hook;

  if (!selectedFolder) return null;

  return (
    <>
      <Card className={paymentSurfaceClass}>
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 dark:hidden" />
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Teacher view</p>
            <h2 className="text-2xl font-bold">
              {selectedFolder.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {teacherDetailView === 'groups'
                ? `${selectedTeacherClasses.length} groups available`
                : t('Teacher payment summary')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={teacherDetailView === 'groups' ? 'default' : 'outline'}
              onClick={() => setTeacherDetailView('groups')}
              className={cn(teacherDetailView === 'groups' && 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white border-0 shadow-lg shadow-cyan-500/30 hover:from-cyan-600 hover:to-sky-700')}
            >
              <Folder className="h-4 w-4 mr-2" />
              Groups
            </Button>
            <Button
              variant={teacherDetailView === 'total' ? 'default' : 'outline'}
              onClick={() => setTeacherDetailView('total')}
              className={cn(teacherDetailView === 'total' && 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/30 hover:from-violet-600 hover:to-purple-700')}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Total
            </Button>
          </div>
        </CardContent>
      </Card>

      {teacherDetailView === 'groups' ? (
        <div className="space-y-4">
          <div className={folderGridClass}>
            {loadingData ? (
              <div className="col-span-full text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading groups...</p>
              </div>
            ) : selectedTeacherClasses.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">No groups found for this teacher</p>
              </div>
            ) : (
              paginatedSelectedTeacherClasses.items.map((cls) => {
                const classId = cls.class_id || cls.id || 0;
                const paymentCount = getPaymentCountForClass(classId);
                const totalAmount = getTotalAmountForClass(classId);
                return (
                  <Card
                    key={classId}
                    className={cn(folderCardClass, 'border-cyan-100 dark:border-border')}
                    onClick={() => handleFolderClick('class', classId, cls.class_name)}
                  >
                    <div className="h-1 bg-gradient-to-r from-cyan-500 to-sky-500 dark:hidden" />
                    <CardContent className="folder-card-content p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="folder-icon flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 dark:bg-muted dark:text-muted-foreground">
                          <Folder className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">{cls.class_name}</h3>
                        <p className="text-xs text-muted-foreground">{cls.class_code} • Level {cls.level}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          <span>{paymentCount} {t('payments')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-primary">
                          <DollarSign className="h-3 w-3" />
                          <span>{formatMoney(totalAmount)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          <SimplePaginationBar
            total={selectedTeacherClasses.length}
            currentPage={paginatedSelectedTeacherClasses.currentPage}
            totalPages={paginatedSelectedTeacherClasses.totalPages}
            start={paginatedSelectedTeacherClasses.start}
            end={paginatedSelectedTeacherClasses.end}
            pageSize={folderPageSize}
            pageSizeOptions={folderPageSizeOptions}
            onPageChange={setFolderPage}
            onPageSizeChange={(value) => {
              setFolderPageSize(value);
              setFolderPage(1);
            }}
          />
        </div>
      ) : (
        <>
          {selectedTeacherStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-cyan-400 via-cyan-500 to-sky-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">Groups</p>
                  <p className="text-lg font-bold text-white">{selectedTeacherClasses.length}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">Worked</p>
                  <p className="text-lg font-bold text-white">{formatMoney(selectedTeacherStats.totalWorked)}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">Paid Amount</p>
                  <p className="text-lg font-bold text-white">{formatMoney(selectedTeacherStats.paidAmount)}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">Unpaid Amount</p>
                  <p className="text-lg font-bold text-white">{formatMoney(selectedTeacherStats.unpaidAmount)}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">Students Paid</p>
                  <p className="text-lg font-bold text-white">
                    {selectedTeacherStats.paidStudents}/{selectedTeacherStats.totalStudents}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {selectedTeacherStats && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-border dark:bg-card dark:bg-none">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Paid vs Unpaid</p>
                    <p className="text-xs text-muted-foreground">Rounded payment share for this teacher</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{selectedTeacherProgress.paidPercent}% paid</p>
                    <p>{selectedTeacherProgress.unpaidPercent}% unpaid</p>
                  </div>
                </div>

                <div className="h-4 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                  <div className="flex h-full w-full">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${selectedTeacherProgress.paidPercent}%` }}
                    />
                    <div
                      className="h-full bg-rose-500 transition-all duration-300"
                      style={{ width: `${selectedTeacherProgress.unpaidPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Paid amount</p>
                    <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatMoney(selectedTeacherStats.paidAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10">
                    <p className="text-xs text-rose-700 dark:text-rose-300">Unpaid amount</p>
                    <p className="text-lg font-semibold text-rose-700 dark:text-rose-300">
                      {formatMoney(selectedTeacherStats.unpaidAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="text-sm text-muted-foreground mb-4">
            {t('Open a group to see the existing payment list.')}
          </div>
        </>
      )}
    </>
  );
};
