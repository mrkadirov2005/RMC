import type { ElementType } from 'react';
import { ClipboardList, Coins, GraduationCap, Mail, Phone, UserRound, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney } from '@/utils/helpers';
import type { AttendanceStats, ClassInfo, StudentProfile, Subject, Teacher } from '../types';

const ProfileRow = ({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon: ElementType }) => (
  <div className="flex items-start gap-3 rounded-lg border border-white/25 bg-white/16 p-3 text-white">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-300 text-[#32164f]">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/65">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-white">{value || '-'}</p>
    </div>
  </div>
);

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
    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-0 bg-[#27133f] p-0 text-white">
      <DialogHeader className="rounded-t-xl bg-[linear-gradient(135deg,#be123c_0%,#7e22ce_48%,#0f766e_100%)] p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 rounded-lg border border-white/30">
            <AvatarFallback className="rounded-lg bg-amber-300 text-2xl font-bold text-[#32164f]">{initials}</AvatarFallback>
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
      <div className="space-y-5 bg-[linear-gradient(135deg,rgba(251,191,36,0.16)_0%,transparent_30%),linear-gradient(315deg,rgba(45,212,191,0.14)_0%,transparent_32%)] p-6">
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
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-cyan-200/25 bg-cyan-300/20 p-4">
            <p className="text-xs font-semibold uppercase text-cyan-100">{t('Attendance')}</p>
            <p className="mt-2 text-3xl font-bold">{attendanceStats.rate}%</p>
            <p className="text-sm text-white/70">{attendanceStats.present}/{attendanceStats.total} {t('present')}</p>
          </div>
          <div className="rounded-lg border border-emerald-200/25 bg-emerald-300/20 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-100">{t('Average Grade')}</p>
            <p className="mt-2 text-3xl font-bold">{averageGrade}%</p>
            <p className="text-sm text-white/70">{gradesCount} {t('records')}</p>
          </div>
          <div className="rounded-lg border border-rose-200/25 bg-rose-300/20 p-4">
            <p className="text-xs font-semibold uppercase text-rose-100">{t('Outstanding Debt')}</p>
            <p className="mt-2 text-3xl font-bold">{formatMoney(outstandingDebt)}</p>
            <p className="text-sm text-white/70">{debtsCount} {t('debt records')}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-white">{t('Subjects')}</p>
          <div className="flex flex-wrap gap-2">
            {subjects.length === 0 ? (
              <Badge className="border-white/20 bg-white/15 text-white">{t('No subjects assigned yet.')}</Badge>
            ) : (
              subjects.map((subject) => (
                <Badge key={subject.subject_id || subject.id} className="border-white/20 bg-white/15 text-white hover:bg-white/20">
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
