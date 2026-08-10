import { BookOpen, Mail, Phone, User, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TeacherProfileSummaryProps {
  teacher: any;
  classesCount: number;
  studentsCount: number;
  getInitials: (firstName: string, lastName: string) => string;
  getStatusClasses: (status: string) => string;
}

export const TeacherProfileSummary = ({
  teacher,
  classesCount,
  studentsCount,
  getInitials,
  getStatusClasses,
}: TeacherProfileSummaryProps) => (
  <Card className="owner-primary-card overflow-hidden rounded-lg border-0 bg-indigo-600 text-white shadow-sm dark:border dark:border-border dark:bg-slate-950">
    <CardContent className="relative p-0">
      <div className="relative flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/20 text-xl font-bold shadow-inner">
            {getInitials(teacher.first_name, teacher.last_name)}
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <p className="text-xs font-semibold text-white/70">Teacher Profile</p>
              <h1 className="break-words text-xl font-bold tracking-normal text-white md:text-2xl">
                {teacher.first_name} {teacher.last_name}
              </h1>
              {teacher.specialization && <p className="text-xs font-semibold text-white/80">{teacher.specialization}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-semibold', getStatusClasses(teacher.status))}>
                {teacher.status}
              </span>
              <span className="owner-secondary-tag inline-flex items-center rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                {teacher.employee_id || 'No employee ID'}
              </span>
              <span className="owner-secondary-tag inline-flex items-center rounded-lg bg-fuchsia-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                Username: {teacher.username || '-'}
              </span>
              <span className="owner-secondary-tag inline-flex items-center rounded-lg bg-cyan-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                Share: {Number(teacher.salary_percentage ?? 50)}%
              </span>
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:w-[330px]">
          <div className="rounded-lg border border-white/25 bg-blue-600 p-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
              <BookOpen className="h-3.5 w-3.5" />
              Classes
            </div>
            <p className="mt-1 text-lg font-bold text-white">{classesCount}</p>
          </div>
          <div className="rounded-lg border border-white/25 bg-emerald-600 p-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
              <User className="h-3.5 w-3.5" />
              Students
            </div>
            <p className="mt-1 text-lg font-bold text-white">{studentsCount}</p>
          </div>
          {teacher.email && (
            <div className="rounded-lg border border-white/25 bg-cyan-600 p-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                <Mail className="h-3.5 w-3.5" />
                Email
              </div>
              <p className="mt-1 truncate text-xs font-semibold text-white">{teacher.email}</p>
            </div>
          )}
          {teacher.phone && (
            <div className="rounded-lg border border-white/25 bg-rose-600 p-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </div>
              <p className="mt-1 truncate text-xs font-semibold text-white">{teacher.phone}</p>
            </div>
          )}
          <div className="rounded-lg border border-white/25 bg-fuchsia-600 p-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/75">
              <Wallet className="h-3.5 w-3.5" />
              Teacher Share
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-white">{Number(teacher.salary_percentage ?? 50)}%</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
