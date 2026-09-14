// Teacher's own profile: read-only personal info + their salary history.

import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, Mail, Phone, IdCard, UserRound, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { teacherAPI } from '../api';
import { useMySalaryDetail } from '../hooks/useMySalaryDetail';
import TeacherSalaryStatsView from './TeacherSalaryStatsView';
import TeacherSalaryTab from './TeacherSalaryTab';
import { showToast } from '@/utils/toast';

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
  const [salaryView, setSalaryView] = useState<'stats' | 'details'>('stats');
  const { detail: salaryDetail, loading: salaryLoading } = useMySalaryDetail(teacherId);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!teacherId) return;
    if (newPw.length < 6) {
      showToast.error('Password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmPw) {
      showToast.error('Passwords do not match');
      return;
    }
    setChanging(true);
    try {
      await teacherAPI.changePassword(Number(teacherId), { old_password: oldPw, new_password: newPw });
      showToast.success('Password changed');
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

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

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <KeyRound className="h-4 w-4 text-sky-600" />
          Change Password
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="teacher-old-pw" className="text-xs">Current password</Label>
            <Input id="teacher-old-pw" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teacher-new-pw" className="text-xs">New password</Label>
            <Input id="teacher-new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teacher-confirm-pw" className="text-xs">Confirm new password</Label>
            <Input id="teacher-confirm-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            onClick={handleChangePassword}
            disabled={changing || !oldPw || !newPw || !confirmPw}
          >
            {changing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <KeyRound className="mr-1.5 h-3.5 w-3.5" />}
            {changing ? 'Saving...' : 'Update password'}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Wallet className="h-4 w-4 text-emerald-600" />
            My Salary
          </h3>
          {salaryView === 'details' && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSalaryView('stats')}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Statistics
            </Button>
          )}
        </div>
        {salaryView === 'stats' ? (
          <TeacherSalaryStatsView
            detail={salaryDetail}
            loading={salaryLoading}
            onViewDetails={() => setSalaryView('details')}
          />
        ) : (
          <TeacherSalaryTab detail={salaryDetail} loading={salaryLoading} />
        )}
      </div>
    </div>
  );
};

export default TeacherProfileTab;
