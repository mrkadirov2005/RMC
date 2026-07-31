// Tab component for the teacher feature.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Coins,
  GraduationCap,
  Loader2,
  PencilLine,
  PlayCircle,
  Search,
  Star,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { classAPI, roomAPI, roomSlotAPI, studentAPI } from '../api';
import { getResolvedCenterId } from '../../../shared/auth/centerScope';
import { useAppSelector } from '../../crm/hooks';
import { showToast } from '../../../utils/toast';
import { useLanguage } from '../../../i18n/LanguageContext';
import TeacherClassDetailPanel from './TeacherClassDetailPanel';
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

type LessonAction = 'attendance' | 'homework' | 'activity' | 'coins' | 'points';

const defaultLessonActions: LessonAction[] = ['attendance', 'homework', 'activity', 'coins'];

const lessonActionOptions: Array<{
  id: LessonAction;
  label: string;
  detail: string;
  icon: typeof CalendarCheck;
}> = [
  { id: 'attendance', label: 'Attendance', detail: 'Mark present, late, excused, or absent.', icon: CalendarCheck },
  { id: 'homework', label: 'Homework', detail: 'Score homework completion.', icon: CheckCircle2 },
  { id: 'activity', label: 'Activity', detail: 'Score class activity.', icon: Star },
  { id: 'coins', label: 'Coins', detail: 'Apply coins from the final score.', icon: Coins },
  { id: 'points', label: 'Points', detail: 'Enter manual points for each student.', icon: PencilLine },
];

// Renders the teacher classes tab tab.
const TeacherClassesTab = ({ teacherId, onRefresh: _onRefresh }: TeacherClassesTabProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const effectiveTeacherId = teacherId ?? user?.id;
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classData, setClassData] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [startingLesson, setStartingLesson] = useState(false);
  const [lessonPickerOpen, setLessonPickerOpen] = useState(false);
  const [selectedLessonActions, setSelectedLessonActions] = useState<LessonAction[]>(defaultLessonActions);
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

  const openSessionWorkflow = (session: any, actions: LessonAction[] = defaultLessonActions) => {
    if (!classData) return;
    const nextSessionId = Number(session.session_id || session.id);
    if (!nextSessionId) return;
    navigate(
      `/classes/${selectedClassId}/sessions/${nextSessionId}/workflow?actions=${actions.join(',')}&from=teacher`
    );
  };

  const toggleLessonAction = (action: LessonAction, checked: boolean) => {
    setSelectedLessonActions((current) => {
      if (checked) return Array.from(new Set([...current, action]));
      return current.filter((item) => item !== action);
    });
  };

  const handleStartLesson = async () => {
    if (!classData || !selectedClassId) return;
    const scoringActions = selectedLessonActions.filter((action) => action !== 'coins');
    if (scoringActions.length === 0) {
      showToast.error('Pick attendance, homework, activity, or points before starting.');
      return;
    }

    const existingTodaySession = sessions.find((session) => {
      if (!session.session_date) return false;
      return new Date(session.session_date).toISOString().split('T')[0] === todayKey;
    });

    if (existingTodaySession) {
      setLessonPickerOpen(false);
      openSessionWorkflow(existingTodaySession, selectedLessonActions);
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
      setLessonPickerOpen(false);
      openSessionWorkflow(nextSession, selectedLessonActions);
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
          onStartLesson={() => setLessonPickerOpen(true)}
          startingLesson={startingLesson}
          students={students}
        />
        <Dialog open={lessonPickerOpen} onOpenChange={(open) => !startingLesson && setLessonPickerOpen(open)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pick lesson actions</DialogTitle>
              <DialogDescription>Select what you want to do in this lesson session.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {lessonActionOptions.map((option) => {
                const Icon = option.icon;
                const checked = selectedLessonActions.includes(option.id);
                return (
                  <Label
                    key={option.id}
                    htmlFor={`teacher-lesson-action-${option.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:bg-slate-50 dark:hover:bg-muted/40"
                  >
                    <Checkbox
                      id={`teacher-lesson-action-${option.id}`}
                      checked={checked}
                      onCheckedChange={(value) => toggleLessonAction(option.id, value === true)}
                      className="mt-1"
                    />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.detail}</span>
                    </span>
                  </Label>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLessonPickerOpen(false)} disabled={startingLesson}>
                Cancel
              </Button>
              <Button onClick={handleStartLesson} disabled={startingLesson} className="bg-rose-600 text-white hover:bg-rose-700">
                {startingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Start
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 420px))',
            justifyContent: 'start',
          }}
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
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
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
                    <Badge className="shrink-0" variant={getStatusVariant(classItem.status) as any}>
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
