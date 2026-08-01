// Source file for the students area in the crm feature.

import { Calendar, Coins, Eye, Mail, Phone, ShieldCheck, User, Users, VenusAndMars, School } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Student {
  student_id?: number;
  id?: number;
  username?: string;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  school_name?: string | null;
  school_class?: string | null;
  gender: string;
  status: string;
  class_id?: number;
  center_id?: number;
  coins?: number;
  created_at?: string;
  createdAt?: string;
}

interface StudentInfoSectionProps {
  student: Student;
}

// Returns status variant.
const getStatusVariant = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'inactive':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'suspended':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const InfoItem = ({
  icon: Icon,
  label,
  value,
  color = 'bg-sky-600',
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string | number | null;
  color?: string;
  children?: ReactNode;
}) => (
  <div className="flex min-h-[42px] gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:bg-sky-50/70 dark:border-border dark:bg-background/70 dark:shadow-none dark:hover:bg-background/70">
    <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm dark:bg-muted dark:text-muted-foreground dark:shadow-none', color)}>
      <Icon className="h-3 w-3" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase leading-3 text-muted-foreground">{label}</p>
      {children || <p className="break-words text-[11px] font-semibold leading-4 text-foreground">{value || '-'}</p>}
    </div>
  </div>
);

// Renders the student info section module.
export const StudentInfoSection = ({ student }: StudentInfoSectionProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const profileItems = [
    { icon: Calendar, label: 'Date of Birth', value: formatDate(student.date_of_birth), color: 'bg-amber-500' },
    { icon: VenusAndMars, label: 'Gender', value: student.gender, color: 'bg-violet-600' },
    { icon: Coins, label: 'Coins', value: Number(student.coins || 0).toLocaleString(), color: 'bg-orange-500' },
  ];
  const contactItems = [
    { icon: Mail, label: 'Email', value: student.email, color: 'bg-fuchsia-600' },
    { icon: Phone, label: 'Phone', value: student.phone, color: 'bg-emerald-600' },
  ];
  const familySchoolItems = [
    { icon: Users, label: 'Parent Name', value: student.parent_name, color: 'bg-cyan-600' },
    { icon: Phone, label: 'Parent Phone', value: student.parent_phone, color: 'bg-rose-600' },
    { icon: School, label: 'School', value: student.school_name, color: 'bg-indigo-600' },
    { icon: School, label: 'School Class', value: student.school_class, color: 'bg-lime-600' },
  ];
  const accountItems = [
    { icon: User, label: 'Username', value: student.username, color: 'bg-sky-600' },
    { icon: ShieldCheck, label: 'Enrollment number', value: student.enrollment_number, color: 'bg-emerald-600' },
    { icon: Calendar, label: 'Added on', value: formatDate(student.created_at || student.createdAt || ''), color: 'bg-cyan-700' },
    { icon: School, label: 'Center ID', value: student.center_id, color: 'bg-indigo-600' },
  ];

  return (
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <Card className="overflow-hidden rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm dark:bg-muted dark:text-muted-foreground dark:shadow-none">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
              <p className="truncate text-xs text-muted-foreground">
                {student.username || `${student.first_name} ${student.last_name}`}
              </p>
            </div>
          </div>
          <DialogTrigger>
            <Button size="sm" className="h-8 w-fit rounded-lg bg-sky-600 text-xs text-white shadow-sm hover:bg-sky-700 dark:bg-primary dark:shadow-none">
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View Details
            </Button>
          </DialogTrigger>
        </CardContent>
      </Card>

      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-lg p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-slate-200 bg-slate-50 p-5 text-left dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-lg font-black text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">
              {student.first_name?.[0]}{student.last_name?.[0]}
            </div>
            <div>
              <DialogTitle className="text-lg">{student.first_name} {student.last_name}</DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">{student.enrollment_number || student.username}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-5 p-5">
          <DetailGroup title="Account" items={accountItems}>
            {student.status && (
              <InfoItem icon={ShieldCheck} label="Status" color="bg-emerald-600">
                <Badge variant="outline" className={cn('border text-xs font-semibold', getStatusVariant(student.status))}>{student.status}</Badge>
              </InfoItem>
            )}
          </DetailGroup>
          <DetailGroup title="Profile" items={profileItems} />
          <DetailGroup title="Contact" items={contactItems} />
          <DetailGroup title="Family & School" items={familySchoolItems} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DetailGroup = ({ title, items, children }: { title: string; items: Array<{ icon: ComponentType<{ className?: string }>; label: string; value?: string | number | null; color: string }>; children?: ReactNode }) => {
  const visibleItems = items.filter((item) => item.value != null && item.value !== '' && item.value !== '-');
  if (!visibleItems.length && !children) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {children}
        {visibleItems.map((item) => <InfoItem key={item.label} icon={item.icon} label={item.label} value={item.value} color={item.color} />)}
      </div>
    </section>
  );
};
