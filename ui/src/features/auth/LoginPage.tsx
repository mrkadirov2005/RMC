// Page component for the LoginPage.tsx screen in the auth feature.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/utils/errorMessage';
import { useAppDispatch, useAppSelector } from '../crm/hooks';
import { setLoading, loginSuccess, loginFailure } from '../../slices/authSlice';
import { authAPI } from '../../shared/api/api';
import { setAuthPersistencePreference } from '../../shared/auth/authStorage';
import { showToast, handleApiError } from '../../utils/toast';

interface LoginPageProps {
  userType: 'superuser' | 'teacher' | 'student';
}

const logoSrc = '/temurbek-school-logo.jpg';

const roleConfig = {
  superuser: {
    icon: ShieldCheck,
    title: 'Branch Admin',
    eyebrow: 'Administration',
    subtitle: 'Sign in to manage students, teachers, payments, and branch operations.',
  },
  owner: {
    icon: Shield,
    title: 'Owner',
    eyebrow: 'Owner access',
    subtitle: 'Full access across branches and system settings.',
  },
  teacher: {
    icon: Users,
    title: 'Teacher',
    eyebrow: 'Teaching staff',
    subtitle: 'Open your classes, attendance, assignments, tests, and grading workspace.',
  },
  student: {
    icon: GraduationCap,
    title: 'Student',
    eyebrow: 'Student portal',
    subtitle: 'View your schedule, tests, assignments, grades, payments, and progress.',
  },
};

const otherRoles = {
  superuser: [
    { type: 'owner' as const, label: 'Owner', path: '/login/owner' },
    { type: 'teacher' as const, label: 'Teacher', path: '/login/teacher' },
    { type: 'student' as const, label: 'Student', path: '/login/student' },
  ],
  teacher: [
    { type: 'superuser' as const, label: 'Admin', path: '/login/superuser' },
    { type: 'student' as const, label: 'Student', path: '/login/student' },
  ],
  student: [
    { type: 'superuser' as const, label: 'Admin', path: '/login/superuser' },
    { type: 'teacher' as const, label: 'Teacher', path: '/login/teacher' },
  ],
};

const inputClass =
  'h-12 rounded-md border-[#d8e4f1] bg-white pl-11 text-[#21116a] placeholder:text-slate-400 focus-visible:border-[#16a7e2] focus-visible:ring-[#16a7e2]/25';

// Renders the login page screen.
export const LoginPage = ({ userType }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const config = roleConfig[userType];
  const RoleIcon = config.icon;

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));

    try {
      let response;
      let userData;
      let token;

      if (userType === 'superuser') {
        response = await authAPI.loginSuperuser({ username, password });
        const { superuser } = response.data;
        userData = {
          id: superuser.superuser_id,
          username: superuser.username,
          email: superuser.email,
          first_name: superuser.first_name,
          last_name: superuser.last_name,
          role: (superuser.role || 'admin').toLowerCase(),
          permissions: Array.isArray(superuser.permissions) ? superuser.permissions : [],
          userType: 'superuser' as const,
          branch_id: Number(superuser.branch_id ?? superuser.center_id ?? 0),
          center_id: Number(superuser.center_id ?? 0),
        };
        token = response.data.token;
      } else if (userType === 'teacher') {
        response = await authAPI.loginTeacher({ username, password });
        const { teacher } = response.data;
        userData = {
          id: teacher.teacher_id,
          username: username,
          email: teacher.email,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          role: 'teacher',
          roles: teacher.roles || ['teacher'],
          userType: 'teacher' as const,
          center_id: Number(teacher.center_id ?? 0),
        };
        token = response.data.token;
      } else if (userType === 'student') {
        response = await authAPI.loginStudent({ username, password });
        const { student } = response.data;
        userData = {
          id: student.student_id,
          username: username,
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          role: 'student',
          userType: 'student' as const,
          center_id: Number(student.center_id ?? 0),
          class_id: student.class_id,
        };
        token = response.data.token;
      }

      if (!userData || !token) {
        throw new Error('Authentication failed. Please try again.');
      }

      setAuthPersistencePreference(rememberMe);
      dispatch(loginSuccess({ user: userData, token }));
      showToast.success('Login successful! Redirecting...');

      if (userType === 'student') navigate('/student-portal');
      else if (userType === 'teacher') navigate('/teacher-portal');
      else if (String(userData?.role || '').toLowerCase() === 'owner') navigate('/owner/manage');
      else navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      dispatch(loginFailure(errorMessage));
      showToast.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleForgotPassword = () => {
    showToast.info('Please contact Temurbek School administration to reset your access.');
  };

  return (
    <main className="min-h-screen bg-[#f6fbff] text-[#21116a] lg:grid lg:grid-cols-2">
      <section className="relative overflow-hidden border-b border-[#d8e4f1] bg-[#fbfdff] px-5 py-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-12 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <img src={logoSrc} alt="Temurbek School" className="h-14 w-auto object-contain sm:h-20 lg:h-24" />
          <Badge className="border-[#16a7e2]/30 bg-[#16a7e2]/10 text-[#21116a] hover:bg-[#16a7e2]/10">
            {config.eyebrow}
          </Badge>
        </div>

        <div className="mt-6 grid gap-5 sm:mt-10 lg:mt-24 lg:max-w-2xl lg:gap-8">
          <div>
            <div className="mb-5 h-1 w-16 rounded-full bg-[#16a7e2]" aria-hidden="true" />
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#16a7e2]">Temurbek School CRM</p>
            <h1 className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-normal text-[#21116a] sm:mt-4 sm:text-4xl lg:text-5xl">
              A focused workspace for learning center operations.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7">
              Secure access for administrators, teachers, and students of Temurbek School.
            </p>
          </div>

          <div className="hidden max-w-xl grid-cols-2 gap-3 sm:grid">
            {[
              ['Branch control', 'Students, teachers, classes'],
              ['Learning flow', 'Tests, grades, attendance'],
              ['Finance view', 'Payments and debts'],
              ['Portals', 'Teacher and student access'],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-lg border border-[#cbe8f8] bg-white p-4 shadow-sm shadow-[#16a7e2]/5">
                <p className="text-sm font-semibold text-[#21116a]">{label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 hidden text-xs text-slate-500 lg:absolute lg:bottom-8 lg:block">
          Temurbek School CRM &copy; {new Date().getFullYear()}
        </div>
      </section>

      <section className="flex items-start bg-[#eef8ff] px-5 py-7 sm:px-8 lg:min-h-screen lg:items-center lg:px-12">
        <div className="w-full max-w-[430px]">
          <div className="mb-6 h-1 w-14 rounded-full bg-[#16a7e2]" aria-hidden="true" />
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#16a7e2]/25 bg-[#16a7e2]/10 text-[#16a7e2]">
              <RoleIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#16a7e2]">{config.eyebrow}</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal text-[#21116a]">
                {config.title} sign in
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{config.subtitle}</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5 border-red-200 bg-red-50 text-red-800">
              <AlertDescription>{getErrorMessage(error)}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor={`${userType}-username`} className="text-sm font-semibold text-[#21116a]">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                <Input
                  id={`${userType}-username`}
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  aria-invalid={Boolean(error)}
                  disabled={loading}
                  autoComplete="username"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor={`${userType}-password`} className="text-sm font-semibold text-[#21116a]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                <Input
                  id={`${userType}-password`}
                  placeholder="Enter password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-invalid={Boolean(error)}
                  disabled={loading}
                  autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 rounded p-1 text-slate-500 transition-colors hover:text-[#21116a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a7e2]/35"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${userType}-remember`} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  id={`${userType}-remember`}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#b9cee2] text-[#16a7e2] focus:ring-[#16a7e2]/30"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-semibold text-[#21116a] underline decoration-[#16a7e2]/40 underline-offset-4 transition-colors hover:text-[#16a7e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a7e2]/35"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-[#21116a] text-white hover:bg-[#160a4d] focus-visible:ring-[#16a7e2]/40"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in
                </>
              ) : (
                <>
                  Continue to {config.title}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 border-t border-[#d8e4f1] pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Switch workspace</p>
            <div className="flex flex-wrap gap-2">
              {otherRoles[userType].map((role) => {
                const OtherIcon = roleConfig[role.type].icon;
                return (
                  <Button
                    key={role.type}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(role.path)}
                    className="border-[#d8e4f1] bg-white text-[#21116a] hover:border-[#16a7e2] hover:bg-[#16a7e2]/5 hover:text-[#21116a] focus-visible:ring-[#16a7e2]/35"
                  >
                    <OtherIcon className="mr-1.5 h-4 w-4" />
                    {role.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {userType === 'superuser' && (
            <button
              type="button"
              onClick={() => navigate('/owner/register')}
              className="mt-5 text-sm font-semibold text-[#21116a] underline decoration-[#16a7e2]/40 underline-offset-4 hover:text-[#16a7e2]"
            >
              Create owner account with keyword
            </button>
          )}
        </div>
      </section>
    </main>
  );
};
