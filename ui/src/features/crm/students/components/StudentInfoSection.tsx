// Source file for the students area in the crm feature.

import { Calendar, Coins, Eye, Hash, Mail, Phone, ShieldCheck, User, Users, VenusAndMars, School } from 'lucide-react';
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
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string | number | null;
  children?: ReactNode;
}) => (
  <div className="flex min-h-[78px] gap-3 rounded-lg border border-sky-100 bg-white/80 p-4 shadow-sm transition-colors hover:bg-sky-50/70 dark:border-border dark:bg-background/70 dark:shadow-none dark:hover:bg-background/70">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm dark:bg-muted dark:bg-none dark:text-muted-foreground dark:shadow-none">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      {children || <p className="break-words text-sm font-semibold text-foreground">{value || '-'}</p>}
    </div>
  </div>
);

// Renders the student info section module.
export const StudentInfoSection = ({ student }: StudentInfoSectionProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <Card className="overflow-hidden rounded-lg border-sky-100 bg-gradient-to-r from-white via-sky-50/80 to-emerald-50/70 shadow-[0_18px_50px_-42px_rgba(14,165,233,0.7)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm dark:bg-muted dark:bg-none dark:text-muted-foreground dark:shadow-none">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
              <p className="truncate text-sm text-muted-foreground">
                {student.enrollment_number || student.username || `${student.first_name} ${student.last_name}`}
              </p>
            </div>
          </div>
          <DialogTrigger>
            <Button className="w-fit rounded-lg bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-sm hover:from-sky-600 hover:to-emerald-600 dark:bg-primary dark:bg-none dark:shadow-none">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </DialogTrigger>
        </CardContent>
      </Card>

      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-lg sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Personal Information</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem icon={Hash} label="Enrollment Number" value={student.enrollment_number} />
          <InfoItem icon={User} label="Username" value={student.username} />
          <InfoItem icon={Mail} label="Email" value={student.email} />
          <InfoItem icon={Phone} label="Phone" value={student.phone} />
          <InfoItem icon={Calendar} label="Date of Birth" value={formatDate(student.date_of_birth)} />
          <InfoItem icon={VenusAndMars} label="Gender" value={student.gender} />
          <InfoItem icon={ShieldCheck} label="Status">
            <Badge
              variant="outline"
              className={cn('text-xs font-semibold border', getStatusVariant(student.status))}
            >
              {student.status || '-'}
            </Badge>
          </InfoItem>
          <InfoItem icon={Coins} label="Coins" value={Number(student.coins || 0).toLocaleString()} />
          <InfoItem icon={Users} label="Parent Name" value={student.parent_name} />
          <InfoItem icon={Phone} label="Parent Phone" value={student.parent_phone} />
          <InfoItem icon={School} label="School" value={student.school_name} />
          <InfoItem icon={School} label="School Class" value={student.school_class} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
