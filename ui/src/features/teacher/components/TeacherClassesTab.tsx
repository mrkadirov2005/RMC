// Tab component for the teacher feature.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeClosed, GraduationCap, Loader2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { classAPI, roomAPI, roomSlotAPI, studentAPI } from '../api';
import { getResolvedCenterId } from '../../../shared/auth/centerScope';
import { useAppSelector } from '../../crm/hooks';
import { showToast } from '../../../utils/toast';
import { useLanguage } from '../../../i18n/LanguageContext';
import { LessonPickerDialog } from '../../crm/classes/components/LessonPickerDialog';
import TeacherClassDetailPanel from './TeacherClassDetailPanel';
import { useMyGroupPayments } from '../payments/useMyGroupPayments';
import { GroupPaidBadge } from '../payments/PaymentStateBadge';
import { formatMoney } from '@/utils/helpers';
import type { TeacherStudentItem } from './TeacherStudentDirectory';

interface ClassInfo {
  class_id: number;
  class_name: string;
  class_code?: string;
  description?: string;
  teacher_id?: number;
  teacher_name?: string;
  center_id?: number;
  level?: number;
  capacity?: number;
  room_number?: string;
  payment_amount?: number;
  payment_frequency?: string;
  section?: string;
  room_assignments?: any[];
  status: string;
  student_count?: number;
  schedule?: string;
}

interface TeacherClassesTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

// Renders the teacher classes tab tab.
const TeacherClassesTab = ({ teacherId, onRefresh: _onRefresh }: TeacherClassesTabProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const { t } = useLanguage();
  const effectiveTeacherId = teacherId ?? user?.id;
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classData, setClassData] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [lessonPickerOpen, setLessonPickerOpen] = useState(false);
  // Payment details stay hidden until the teacher opens them with the eye, as inside a class.
  const [showPayments, setShowPayments] = useState(false);
  // This month's payments per group, from the same figures as Profile → Payments.
  const { data: groupPayments } = useMyGroupPayments();
  const paymentsByClass = useMemo(
    () => new Map((groupPayments?.groups || []).map((group) => [group.class_id, group])),
    [groupPayments]
  );
  const selectedGroupPayment = selectedClassId ? paymentsByClass.get(selectedClassId) : undefined;
  const selectedPaymentStates = useMemo(
    () => (selectedGroupPayment ? new Map(selectedGroupPayment.students.map((student) => [student.student_id, student])) : undefined),
    [selectedGroupPayment]
  );

// Runs side effects for this component.
  useEffect(() => {
    void loadClasses();
  }, [effectiveTeacherId]);

  useEffect(() => {
    let cancelled = false;

    const loadClassDetails = async () => {
      if (!selectedClassId) {
        setClassData(null);
        setStudents([]);
        return;
      }

      try {
        setDetailLoading(true);
        const centerId = getResolvedCenterId(user) || undefined;
        const [classResponse, studentsResponse, roomsResponse, bookingResponse] = await Promise.all([
          classAPI.getById(selectedClassId),
          studentAPI.getByClassWithTransfers(selectedClassId, { exclude_transferred: 1 }).catch(() => ({ data: [] })),
          roomAPI.getAll(centerId ? { center_id: centerId } : undefined).catch(() => ({ data: [] })),
          roomSlotAPI.getBookingsByClass(selectedClassId, centerId ? { center_id: centerId } : undefined).catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        const nextClass = classResponse?.data ?? classResponse;
        const roomNumbers = new Set<string>();
        String(nextClass?.room_number || '')
          .split(',')
          .map((room: string) => room.trim())
          .filter(Boolean)
          .forEach((room) => roomNumbers.add(room));
        const roomAssignments = Array.isArray(nextClass?.room_assignments) ? nextClass.room_assignments : [];
        roomAssignments
          .map((room: any) => String(room.room_number || '').trim())
          .filter(Boolean)
          .forEach((room: string) => roomNumbers.add(room));
        const roomsPayload = roomsResponse?.data || [];
        const rooms = Array.isArray(roomsPayload) ? roomsPayload : Array.isArray(roomsPayload.data) ? roomsPayload.data : [];
        rooms
          .filter((room: any) => Number(room.class_id) === selectedClassId)
          .map((room: any) => String(room.room_number || '').trim())
          .filter(Boolean)
          .forEach((room: string) => roomNumbers.add(room));
        const bookingPayload = bookingResponse?.data || [];
        const bookings = Array.isArray(bookingPayload) ? bookingPayload : Array.isArray(bookingPayload.data) ? bookingPayload.data : [];
        bookings
          .map((booking: any) => String(booking.room_number || '').trim())
          .filter(Boolean)
          .forEach((room: string) => roomNumbers.add(room));

        setClassData({ ...nextClass, room_number: Array.from(roomNumbers).join(', ') || nextClass?.room_number });
        const nextStudents = Array.isArray(studentsResponse?.data) ? studentsResponse.data : [];
        setStudents(
          nextStudents.map((student: any) => ({
            ...student,
            first_name: String(student?.first_name || ''),
            last_name: String(student?.last_name || ''),
            enrollment_number: String(student?.enrollment_number || ''),
            status: String(student?.status || 'Active'),
          }))
        );
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading class details:', error);
          showToast.error('Failed to load class details.');
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    void loadClassDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedClassId, user]);

// Loads classes.
  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAll(
        effectiveTeacherId ? { teacher_id: Number(effectiveTeacherId), page: 1, limit: 100 } : { page: 1, limit: 100 }
      );
      const payload = response.data || [];
      const scopedClasses = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
      setClasses(scopedClasses);
      // Do not auto-open the first class — show list of groups instead.
      setSelectedClassId(null);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveTeacherId]);

  const parseSchedulePreview = (section?: string) => {
    if (!section) return '';
    try {
      const parsed = JSON.parse(section);
      const days = Array.isArray(parsed?.days) ? parsed.days.join(', ') : '';
      const time = String(parsed?.time || '');
      const endTime = String(parsed?.endTime || '');
      return [days, [time, endTime].filter(Boolean).join(' - ')].filter(Boolean).join(' / ');
    } catch {
      return section;
    }
  };

// Returns status variant.
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'destructive';
      case 'completed':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const filteredClasses = useMemo(() => {
    if (!searchTerm) return classes;
    const query = searchTerm.toLowerCase();
    return classes.filter((classItem) => {
      const scheduleText = parseSchedulePreview(classItem.section);
      return (
        String(classItem.class_name || '').toLowerCase().includes(query) ||
        String(classItem.class_code || '').toLowerCase().includes(query) ||
        String(classItem.room_number || '').toLowerCase().includes(query) ||
        scheduleText.toLowerCase().includes(query)
      );
    });
  }, [classes, searchTerm]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
        <GraduationCap className="h-14 w-14 text-muted-foreground/40 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          {t('No classes assigned yet')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('Classes will appear here once they are assigned to you')}
        </p>
      </div>
    );
  }

  if (classData && selectedClassId) {
    return (
      <>
        <TeacherClassDetailPanel
          classData={classData}
          loading={detailLoading}
          onBack={() => setSelectedClassId(null)}
          onStartLesson={() => setLessonPickerOpen(true)}
          students={students}
          paymentStates={selectedPaymentStates}
        />
        <LessonPickerDialog
          open={lessonPickerOpen}
          onOpenChange={setLessonPickerOpen}
          classId={selectedClassId}
          label={classData.class_name}
          section={classData.section}
          from="teacher"
        />
      </>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('Search classes by name, code, schedule, room...')}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPayments((value) => !value)}
            aria-label={showPayments ? t('Hide details') : t('Show details')}
            title={showPayments ? t('Hide details') : t('Show details')}
          >
            {showPayments ? <EyeClosed className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
        </div>

        {/* Phones: one card per group instead of a table that is cut off at the side. */}
        <div className="space-y-2 sm:hidden">
          {filteredClasses.map((classItem) => {
            const scheduleText = parseSchedulePreview(classItem.section) || classItem.schedule || t('No schedule');
            const payment = paymentsByClass.get(Number(classItem.class_id));
            return (
              <button
                key={classItem.class_id}
                type="button"
                onClick={() => setSelectedClassId(Number(classItem.class_id))}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-muted/40 dark:border-border dark:bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900 dark:text-card-foreground">{classItem.class_name}</div>
                    <div className="text-xs text-muted-foreground">{t('{count} students', { count: String(classItem.student_count || 0) })}</div>
                  </div>
                  <Badge variant={getStatusVariant(classItem.status) as any} className="shrink-0 text-xs">{t(classItem.status || 'Active')}</Badge>
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-muted-foreground">
                  <div>{scheduleText}</div>
                  <div>{classItem.room_number || t('No room')}</div>
                </div>
                {showPayments && payment && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <GroupPaidBadge paid={payment.paid_students} total={payment.total_students} />
                    {payment.remaining > 0 && (
                      <span className="text-xs font-semibold tabular-nums text-rose-600">
                        {t('{amount} left', { amount: formatMoney(payment.remaining) })}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden w-full overflow-auto rounded-xl border border-slate-200/80 bg-white sm:block" style={{ maxHeight: '60vh' }}>
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 px-3 py-2 text-sm">№</TableHead>
                <TableHead className="px-3 py-2 text-sm">{t('Class name')}</TableHead>
                <TableHead className="px-3 py-2 text-sm">{t('Students')}</TableHead>
                <TableHead className="px-3 py-2 text-sm">{t('Schedule')}</TableHead>
                <TableHead className="px-3 py-2 text-sm">{t('Room')}</TableHead>
                {showPayments && <TableHead className="px-3 py-2 text-sm">{t('Payment this month')}</TableHead>}
                <TableHead className="px-3 py-2 text-sm">{t('Status')}</TableHead>
                <TableHead className="px-3 py-2 text-sm" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((classItem, idx) => {
                const scheduleText = parseSchedulePreview(classItem.section) || classItem.schedule || t('No schedule');
                return (
                  <TableRow key={classItem.class_id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedClassId(Number(classItem.class_id))}>
                    <TableCell className="px-3 py-2 text-sm text-slate-700">{idx + 1}</TableCell>
                    <TableCell className="px-3 py-2">
                      <div className="font-semibold text-slate-900 text-sm">{classItem.class_name}</div>
                      <div className="text-xs text-slate-500">{classItem.description || ''}</div>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-sm text-slate-700">{classItem.student_count || 0}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-slate-700">{scheduleText}</TableCell>
                    <TableCell className="px-3 py-2 text-sm text-slate-700">{classItem.room_number || t('No room')}</TableCell>
                    {showPayments && <TableCell className="px-3 py-2">
                      {(() => {
                        const payment = paymentsByClass.get(Number(classItem.class_id));
                        if (!payment) return <span className="text-xs text-muted-foreground">—</span>;
                        return (
                          <div className="space-y-0.5">
                            <GroupPaidBadge paid={payment.paid_students} total={payment.total_students} />
                            {payment.remaining > 0 && (
                              <div className="text-xs font-semibold tabular-nums text-rose-600">
                                {t('{amount} left', { amount: formatMoney(payment.remaining) })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>}
                    <TableCell className="px-3 py-2">
                      <Badge variant={getStatusVariant(classItem.status) as any} className="text-sm">{t(classItem.status || 'Active')}</Badge>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-black text-right">
                      <Button variant = "default" size="sm"  className = "text-black" onClick={(e) => { e.stopPropagation(); setSelectedClassId(Number(classItem.class_id)); }}>
                        {t('Open')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherClassesTab;
