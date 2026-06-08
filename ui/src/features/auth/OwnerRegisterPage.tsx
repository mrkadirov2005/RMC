// Page component for the OwnerRegisterPage.tsx screen in the auth feature.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAppDispatch, useAppSelector } from '../crm/hooks';
import { loginSuccess, setLoading, loginFailure } from '../../slices/authSlice';
import { authAPI } from '../../shared/api/api';
import { handleApiError, showToast } from '../../utils/toast';

const OWNER_INVITE_KEY = import.meta.env.VITE_OWNER_INVITE_KEY ?? 'owner-create-2026';
const logoSrc = '/temurbek-school-logo.jpg';
const inputClass =
  'h-12 rounded-md border-[#d8e4f1] bg-white pl-11 text-[#21116a] placeholder:text-slate-400 focus-visible:border-[#16a7e2] focus-visible:ring-[#16a7e2]/25';

// Renders the owner register page screen.
export const OwnerRegisterPage = () => {
  const [step, setStep] = useState<'keyword' | 'form'>('keyword');
  const [keyword, setKeyword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading } = useAppSelector((state) => state.auth);

// Memoizes the is keyword valid derived value.
  const isKeywordValid = useMemo(
    () => keyword.trim().length > 0 && keyword.trim() === OWNER_INVITE_KEY,
    [keyword]
  );

// Handles unlock.
  const unlock = () => {
    if (!isKeywordValid) {
      setLocalError('Invalid keyword.');
      return;
    }
    setLocalError('');
    setStep('form');
  };

// Handles create.
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    dispatch(setLoading(true));
    setLocalError('');

    try {
      const response = await authAPI.registerOwner({
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        invite_key: keyword.trim(),
      });
      const owner = response.data.owner;

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
          token: response.data.token || `owner-token-${Date.now()}`,
        })
      );

      showToast.success('Owner account created successfully.');
      navigate('/owner/manage');
    } catch (err: any) {
      const errorMsg = handleApiError(err);
      setLocalError(errorMsg);
      dispatch(loginFailure(errorMsg));
      showToast.error(errorMsg);
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <main data-translation-skip className="min-h-screen bg-[#f6fbff] text-[#21116a] lg:grid lg:grid-cols-2">
      <section className="relative overflow-hidden border-b border-[#d8e4f1] bg-[#21116a] px-5 py-4 text-white lg:min-h-screen lg:border-b-0 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-lg bg-white p-2.5">
            <img src={logoSrc} alt="Temurbek School" className="h-12 w-auto object-contain lg:h-16" />
          </div>
          <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">Owner setup</Badge>
        </div>

        <div className="mt-8 max-w-xl lg:mt-28">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#16a7e2]">Temurbek School CRM</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl lg:mt-4 lg:text-5xl">
            Create protected owner access for the learning center.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:mt-5 sm:text-base sm:leading-7">
            Owner creation is locked behind a shared keyword so daily staff accounts stay separate from system ownership.
          </p>
        </div>

        <div className="mt-8 hidden rounded-lg border border-white/15 bg-white/10 p-4 text-sm text-white/80 lg:block">
          Use owner access only for branch oversight, global settings, and manager-level account control.
        </div>
      </section>

      <section className="flex items-start bg-[#eef8ff] px-5 py-7 sm:px-8 lg:min-h-screen lg:items-center lg:px-14">
        <div className="w-full max-w-[460px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login/owner')}
            className="mb-7 px-0 text-[#21116a] hover:bg-transparent hover:text-[#16a7e2]"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to owner login
          </Button>

          <div className="mb-6 h-1 w-14 rounded-full bg-[#16a7e2]" aria-hidden="true" />
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#16a7e2]/25 bg-[#16a7e2]/10 text-[#16a7e2]">
              {step === 'keyword' ? <KeyRound className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#16a7e2]">
                {step === 'keyword' ? 'Keyword required' : 'Owner profile'}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal text-[#21116a]">
                {step === 'keyword' ? 'Unlock owner registration' : 'Create owner account'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {step === 'keyword'
                  ? 'Enter the shared keyword before creating a system owner.'
                  : 'Add the owner details that will be used for manager access.'}
              </p>
            </div>
          </div>

          {localError && (
            <Alert variant="destructive" className="mb-5 border-red-200 bg-red-50 text-red-800">
              <AlertDescription>{localError}</AlertDescription>
            </Alert>
          )}

          {step === 'keyword' ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="owner-keyword" className="text-sm font-semibold text-[#21116a]">
                  Owner keyword
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                  <Input
                    id="owner-keyword"
                    placeholder="Enter keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    aria-invalid={Boolean(localError)}
                    className={inputClass}
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={unlock}
                className="h-12 w-full bg-[#21116a] text-white hover:bg-[#160a4d] focus-visible:ring-[#16a7e2]/40"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="owner-first-name" className="text-sm font-semibold text-[#21116a]">
                    First name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                    <Input
                      id="owner-first-name"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="owner-last-name" className="text-sm font-semibold text-[#21116a]">
                    Last name
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                    <Input
                      id="owner-last-name"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="owner-register-username" className="text-sm font-semibold text-[#21116a]">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                  <Input
                    id="owner-register-username"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="owner-email" className="text-sm font-semibold text-[#21116a]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                  <Input
                    id="owner-email"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="owner-register-password" className="text-sm font-semibold text-[#21116a]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                  <Input
                    id="owner-register-password"
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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

              <div className="space-y-2">
                <label htmlFor="owner-confirm-password" className="text-sm font-semibold text-[#21116a]">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#16a7e2]" />
                  <Input
                    id="owner-confirm-password"
                    placeholder="Confirm password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 rounded p-1 text-slate-500 transition-colors hover:text-[#21116a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16a7e2]/35"
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full bg-[#21116a] text-white hover:bg-[#160a4d] focus-visible:ring-[#16a7e2]/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating
                  </>
                ) : (
                  <>
                    Create Owner Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
