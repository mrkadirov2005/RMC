import { BadgeCheck, Calendar, GraduationCap, Mail, Phone, User, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TeacherInfoTabProps {
  teacher: any;
}

export default function TeacherInfoTab({ teacher }: TeacherInfoTabProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Card className="h-full rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm text-indigo-700 dark:text-indigo-300">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-3 pt-1">
          <InfoRow Icon={User} tone="bg-fuchsia-600" label="Username" value={teacher.username || '-'} />
          <InfoRow Icon={Mail} tone="bg-cyan-600" label="Email" value={teacher.email || '-'} breakAll />
          <InfoRow Icon={Phone} tone="bg-emerald-600" label="Phone" value={teacher.phone || '-'} />
          <InfoRow
            Icon={Calendar}
            tone="bg-amber-500"
            label="Date of Birth"
            value={teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : 'N/A'}
          />
        </CardContent>
      </Card>
      <Card className="h-full rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300">Professional Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 p-3 pt-1">
          <InfoRow Icon={BadgeCheck} tone="bg-amber-500" label="Employee ID" value={teacher.employee_id || '-'} />
          <InfoRow Icon={GraduationCap} tone="bg-violet-600" label="Qualification" value={teacher.qualification || '-'} />
          <InfoRow Icon={GraduationCap} tone="bg-rose-600" label="Specialization" value={teacher.specialization || '-'} />
          <InfoRow Icon={Wallet} tone="bg-fuchsia-600" label="Teacher Share" value={`${Number(teacher.salary_percentage ?? 50)}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

const InfoRow = ({
  Icon,
  tone,
  label,
  value,
  breakAll = false,
}: {
  Icon: any;
  tone: string;
  label: string;
  value: string;
  breakAll?: boolean;
}) => (
  <div className="flex min-h-[46px] items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70">
    <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`${breakAll ? 'break-all' : 'truncate'} text-xs font-semibold`}>{value}</p>
    </div>
  </div>
);
