// Teacher's own profile: read-only personal info + their salary history.

import { useEffect, useState } from 'react';
import { Loader2, Mail, Phone, IdCard, UserRound, Wallet } from 'lucide-react';
import { teacherAPI } from '@/shared/api/api';
import TeacherSalaryTab from './TeacherSalaryTab';

interface TeacherProfileTabProps {
  teacherId?: number | string;
}

interface TeacherProfile {
  teacher_id: number;
  employee_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
}

const TeacherProfileTab = ({ teacherId }: TeacherProfileTabProps) => {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) return;
    let active = true;
    setLoading(true);
    teacherAPI
      .getMyProfile()
      .then((response: any) => {
        if (!active) return;
        setProfile(response?.data ?? response ?? null);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teacherId]);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Teacher';

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !profile ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Unable to load your profile.</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{fullName}</h2>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{profile.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span className="truncate">{profile.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IdCard className="h-4 w-4 shrink-0" />
                  <span className="truncate">{profile.employee_id || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Wallet className="h-4 w-4 text-emerald-600" />
          My Salary
        </h3>
        <TeacherSalaryTab teacherId={teacherId} />
      </div>
    </div>
  );
};

export default TeacherProfileTab;
