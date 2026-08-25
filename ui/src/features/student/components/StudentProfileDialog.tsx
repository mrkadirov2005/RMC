import type { ElementType } from 'react';
import { CalendarDays, ClipboardList, Coins, GraduationCap, Mail, Phone, UserRound, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney } from '@/utils/helpers';
import type { AttendanceStats, ClassInfo, StudentProfile, Subject, Teacher } from '../types';

const ProfileRow = ({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon: ElementType }) => (
  <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600/10 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">{value || '-'}</p>
    </div>
  </div>
);

const formatJoinedDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

interface StudentProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initials: string;
  studentName: string;
  username?: string;
  student: StudentProfile | null;
  teacher: Teacher | null;
  classInfo: ClassInfo | null;
  subjects: Subject[];
  attendanceStats: AttendanceStats;
  averageGrade: number;
  gradesCount: number;
  outstandingDebt: number;
  debtsCount: number;
  t: (value: string) => string;
}

export const StudentProfileDialog = ({
  open,
  onOpenChange,
  initials,
  studentName,
  username,
  student,
  teacher,
  classInfo,
  subjects,
  attendanceStats,
  averageGrade,
  gradesCount,
  outstandingDebt,
  debtsCount,
  t,
}: StudentProfileDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
      <DialogHeader className="rounded-t-xl border-b bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 rounded-lg border border-white/30">
            <AvatarFallback className="rounded-lg bg-white/20 text-2xl font-bold text-white">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle className="text-2xl text-white">{studentName}</DialogTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className="border-white/20 bg-white/20 text-white hover:bg-white/25">{student?.status || t('Student')}</Badge>
              {classInfo?.class_name && <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">{classInfo.class_name}</Badge>}
              {student?.enrollment_number && <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">{student.enrollment_number}</Badge>}
            </div>
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileRow label={t('Username')} value={username || student?.enrollment_number} icon={UserRound} />
          <ProfileRow label={t('Email')} value={student?.email} icon={Mail} />
          <ProfileRow label={t('Phone')} value={student?.phone} icon={Phone} />
          <ProfileRow label={t('Guardian')} value={student?.parent_name} icon={Users} />
          <ProfileRow label={t('Guardian Phone')} value={student?.parent_phone} icon={Phone} />
          <ProfileRow label={t('Coins')} value={Number(student?.coins || 0).toLocaleString()} icon={Coins} />
          <ProfileRow label={t('Class')} value={classInfo?.class_name || (student?.class_id ? `#${student.class_id}` : '-')} icon={GraduationCap} />
          <ProfileRow label={t('Class Code')} value={classInfo?.class_code} icon={ClipboardList} />
          <ProfileRow label={t('Teacher')} value={teacher?.first_name ? `${teacher.first_name} ${teacher.last_name || ''}` : '-'} icon={UserRound} />
          <ProfileRow label={t('Added on')} value={formatJoinedDate(student?.created_at || student?.createdAt)} icon={CalendarDays} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{t('Attendance')}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{attendanceStats.rate}%</p>
            <p className="text-sm text-muted-foreground">{attendanceStats.present}/{attendanceStats.total} {t('present')}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{t('Average Grade')}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{averageGrade}%</p>
            <p className="text-sm text-muted-foreground">{gradesCount} {t('records')}</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{t('Outstanding Debt')}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{formatMoney(outstandingDebt)}</p>
            <p className="text-sm text-muted-foreground">{debtsCount} {t('debt records')}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">{t('Subjects')}</p>
          <div className="flex flex-wrap gap-2">
            {subjects.length === 0 ? (
              <Badge variant="outline">{t('No subjects assigned yet.')}</Badge>
            ) : (
              subjects.map((subject) => (
                <Badge key={subject.subject_id || subject.id} variant="outline">
                  {subject.subject_name}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
