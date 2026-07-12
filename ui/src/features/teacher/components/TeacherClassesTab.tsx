// Tab component for the teacher feature.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, GraduationCap, Loader2, Search, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { classAPI, roomAPI, roomSlotAPI, studentAPI } from '../../../shared/api/api';
import { getResolvedCenterId } from '../../../shared/auth/centerScope';
import { useAppSelector } from '../../crm/hooks';
import SessionModal from '../../crm/classes/SessionModal';
import { showToast } from '../../../utils/toast';
import { useLanguage } from '../../../i18n/LanguageContext';
import TeacherClassDetailPanel from './TeacherClassDetailPanel';

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

interface StudentItem {
  student_id?: number;
  id?: number;
  class_id?: number;
  first_name?: string;
  last_name?: string;
  enrollment_number?: string;
  status?: string;
  phone?: string;
  deleted_at?: string | null;
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
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionModalId, setSessionModalId] = useState<number | null>(null);
  const [sessionModalDate, setSessionModalDate] = useState('');
  const [sessionModalCenterId, setSessionModalCenterId] = useState<number | undefined>(undefined);
  const [startingLesson, setStartingLesson] = useState(false);
  const todayKey = new Date().toISOString().split('T')[0];

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
        setSessions([]);
        return;
      }

      try {
        setDetailLoading(true);
        const centerId = getResolvedCenterId(user) || undefined;
        const [classResponse, studentsResponse, sessionsResponse, roomsResponse, bookingResponse] = await Promise.all([
          classAPI.getById(selectedClassId),
          studentAPI.getByClassWithTransfers(selectedClassId).catch(() => ({ data: [] })),
          classAPI.getSessions(selectedClassId).catch(() => ({ data: [] })),
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
        setStudents(Array.isArray(studentsResponse?.data) ? studentsResponse.data : []);
        setSessions(Array.isArray(sessionsResponse?.data) ? sessionsResponse.data : []);
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
      setSelectedClassId((current) => current ?? (Number(scopedClasses[0]?.class_id || 0) || null));
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

  const openSessionWorkflow = (session: any) => {
    if (!classData) return;
    const nextSessionId = Number(session.session_id || session.id);
    if (!nextSessionId) return;
    setSessionModalId(nextSessionId);
    setSessionModalDate(session.session_date ? new Date(session.session_date).toISOString().split('T')[0] : todayKey);
    setSessionModalCenterId(Number(session.center_id || classData.center_id || 0) || getResolvedCenterId(user) || undefined);
    setSessionModalOpen(true);
  };

  const handleStartLesson = async () => {
    if (!classData || !selectedClassId) return;

    const existingTodaySession = sessions.find((session) => {
      if (!session.session_date) return false;
      return new Date(session.session_date).toISOString().split('T')[0] === todayKey;
    });

    if (existingTodaySession) {
      openSessionWorkflow(existingTodaySession);
      return;
    }

    setStartingLesson(true);
    try {
      const targetCenterId = Number(classData.center_id || 0) || getResolvedCenterId(user) || undefined;
      if (!targetCenterId) {
        showToast.error('Please select an active center before starting a lesson.');
        return;
      }

      let startTime = new Date().toTimeString().slice(0, 5);
      let durationMinutes = 90;

      if (classData.section) {
        try {
          const parsed = JSON.parse(classData.section);
          startTime = String(parsed?.time || startTime);
          const endTime = String(parsed?.endTime || '');
          if (startTime && endTime) {
            const [startHoursRaw, startMinutesRaw] = startTime.split(':');
            const [endHoursRaw, endMinutesRaw] = endTime.split(':');
            const duration = Number(endHoursRaw) * 60 + Number(endMinutesRaw) - (Number(startHoursRaw) * 60 + Number(startMinutesRaw));
            if (duration > 0) durationMinutes = duration;
          }
        } catch {
          // Ignore schedule parsing fallback and use defaults.
        }
      }

      const response = await classAPI.createSession(selectedClassId, {
        center_id: targetCenterId,
        session_date: todayKey,
        start_time: startTime,
        duration_minutes: durationMinutes,
        teacher_id: user?.userType === 'teacher' && user?.id ? Number(user.id) : Number(classData.teacher_id || 0) || undefined,
      });

      const nextSession = response?.data ?? response;
      setSessions((current) => [...current, nextSession]);
      openSessionWorkflow(nextSession);
    } catch (error) {
      console.error('Failed to start lesson:', error);
      showToast.error('Failed to start lesson.');
    } finally {
      setStartingLesson(false);
    }
  };

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
          onStartLesson={handleStartLesson}
          startingLesson={startingLesson}
          students={students}
        />
        <SessionModal
          open={sessionModalOpen}
          classData={classData}
          sessionId={sessionModalId}
          selectedDate={sessionModalDate}
          onClose={() => {
            setSessionModalOpen(false);
            setSessionModalId(null);
            setSessionModalDate('');
            setSessionModalCenterId(undefined);
          }}
          sessionCenterId={sessionModalCenterId}
        />
      </>
    );
  }

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('My Classes')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('Open one of your classes to see students and start a lesson.')}
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('Search classes by name, code, schedule, room...')}
              className="pl-9"
            />
          </div>
        </div>

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}
        >
          {filteredClasses.map((classItem) => {
            const scheduleText = parseSchedulePreview(classItem.section) || classItem.schedule || t('No schedule');
            return (
              <button
                key={classItem.class_id}
                type="button"
                onClick={() => setSelectedClassId(Number(classItem.class_id))}
                className="group rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-border dark:bg-card"
              >
                <div className="flex h-full flex-col gap-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-gradient-to-br from-indigo-500/15 to-sky-500/10 p-2.5 text-indigo-600 transition-colors group-hover:from-indigo-500/20 group-hover:to-sky-500/15">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="line-clamp-2 text-base font-semibold text-slate-950 dark:text-foreground">
                          {classItem.class_name}
                        </h4>
                        <p className="mt-1 truncate text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                          {classItem.class_code || t('No code')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(classItem.status) as any}>
                      {t(classItem.status || 'Active')}
                    </Badge>
                  </div>

                  <div className="grid gap-2 rounded-lg bg-slate-50/80 p-3 text-sm text-muted-foreground dark:bg-muted/30">
                    <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{classItem.student_count || 0} {t('Students')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="line-clamp-2">{scheduleText}</span>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                    <span className="truncate text-xs font-medium text-muted-foreground">
                      {classItem.room_number || t('No room')}
                    </span>
                    <span className="inline-flex shrink-0 items-center rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition-colors group-hover:border-indigo-200 group-hover:bg-indigo-100 dark:border-white/10 dark:bg-muted dark:text-foreground">
                      <BookOpen className="mr-2 h-4 w-4" />
                      {t('Open class')}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherClassesTab;
