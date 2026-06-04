// Page component for the OwnerLoginPage.tsx screen in the auth feature.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Shield,
  User,
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

const logoSrc = '/temurbek-school-logo.jpg';
const inputClass =
  'h-12 rounded-md border-[#d8e4f1] bg-white pl-11 text-[#21116a] placeholder:text-slate-400 focus-visible:border-[#16a7e2] focus-visible:ring-[#16a7e2]/25';

// Renders the owner login page screen.
export const OwnerLoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));

    try {
      const response = await authAPI.loginOwner({ username, password });
      const owner = response.data.owner || response.data.superuser;
      if (!owner) {
        throw new Error('Owner login response was invalid.');
      }

      const token = response.data.token;
      if (!token) {
        throw new Error('Authentication failed. Please try again.');
      }

      setAuthPersistencePreference(rememberMe);
      dispatch(
        loginSuccess({
          user: {
            id: owner.owner_id,
            username: owner.username,
            email: owner.email,
            first_name: owner.first_name,
            last_name: owner.last_name,
            role: 'owner',
            userType: 'superuser',
            center_id: 0,
          },
          token,
        })
      );

      showToast.success('Owner login successful! Accessing manager panel...');
      navigate('/owner/manage');
    } catch (err: any) {
      const errorMsg = handleApiError(err);
      dispatch(loginFailure(errorMsg));
      showToast.error(errorMsg);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleForgotPassword = () => {
    showToast.info('Please contact Temurbek School administration to reset owner access.');
  };

  return (
    <main className="min-h-screen bg-[#f6fbff] text-[#21116a] lg:grid lg:grid-cols-2">
      <section className="relative flex flex-col overflow-hidden border-b border-[#d8e4f1] bg-[#21116a] px-5 py-6 text-white lg:min-h-screen lg:border-b-0 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-lg bg-white p-2.5">
            <img src={logoSrc} alt="Temurbek School" className="h-12 w-auto object-contain lg:h-16" />
          </div>
          <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Owner access</Badge>
        </div>

        <div className="mt-8 max-w-xl lg:mt-auto">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#16a7e2]">Temurbek School CRM</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl lg:mt-4 lg:text-5xl">
            System-level access for the learning center owner.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:mt-5 sm:text-base sm:leading-7">
            Use this entry only for owner management, branch oversight, and global CRM settings.
          </p>
        </div>

        <div className="mt-8 hidden rounded-lg border border-white/15 bg-white/10 p-4 text-sm text-white/80 lg:mt-auto lg:block">
          Owner accounts can create and manage branch-level access. Keep these credentials separate from daily admin accounts.
        </div>
      </section>

      <section className="flex items-start justify-center bg-[#eef8ff] px-5 py-7 sm:px-8 lg:min-h-screen lg:items-center lg:px-14">
        <div className="w-full max-w-[430px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login/superuser')}
            className="mb-7 px-0 text-[#21116a] hover:bg-transparent hover:text-[#16a7e2]"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to admin login
          </Button>

          <div className="mb-6 h-1 w-14 rounded-full bg-[#16a7e2]" aria-hidden="true" />
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#16a7e2]/25 bg-[#16a7e2]/10 text-[#16a7e2]">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#16a7e2]">Restricted access</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal text-[#21116a]">Owner sign in</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Access the Temurbek School manager panel.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/owner/register')}
            className="mb-5 text-sm font-semibold text-[#21116a] underline decoration-[#16a7e2]/40 underline-offset-4 hover:text-[#16a7e2]"
          >
            Create owner account with keyword
          </button>

          {error && (
            <Alert variant="destructive" className="mb-5 border-red-200 bg-red-50 text-red-800">
              <AlertDescription>{getErrorMessage(error)}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="owner-username" className="text-sm font-semibold text-[#21116a]">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                <Input
                  id="owner-username"
                  placeholder="Enter owner username"
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
              <label htmlFor="owner-password" className="text-sm font-semibold text-[#21116a]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                <Input
                  id="owner-password"
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
              <label htmlFor="owner-remember" className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  id="owner-remember"
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
                  Access Manager Panel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
};
