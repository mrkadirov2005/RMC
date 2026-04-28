// Page component for the OwnerRegisterPage.tsx screen in the auth feature.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Lock, Mail, Shield, User, Users, Loader2, KeyRound, Eye, EyeOff,
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.14)_0%,transparent_40%),radial-gradient(circle_at_80%_80%,rgba(239,68,68,0.12)_0%,transparent_45%)]" />

      <div className="relative z-10 w-full max-w-[460px] px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/login/owner')}
          className="mb-6 text-white/40 hover:text-white/70"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Owner Login
        </Button>

        <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/40 -rotate-[5deg]">
          <Shield className="w-11 h-11 text-white" />
        </div>

        <Badge variant="outline" className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
          <KeyRound className="w-3.5 h-3.5 mr-1.5" />
          Keyword Required
        </Badge>

        <h2 className="text-3xl font-bold text-white mb-1">Create Owner Account</h2>
        <p className="text-white/45 mb-6">Enter the shared keyword to unlock owner registration.</p>

        {localError && (
          <Alert variant="destructive" className="mb-4 bg-red-500/10 text-red-300 border-red-500/20">
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}

        {step === 'keyword' ? (
          <div className="space-y-3">
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Enter keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
              />
            </div>
            <Button
              type="button"
              onClick={unlock}
              className="w-full h-12 text-white bg-gradient-to-r from-amber-400 to-red-500 hover:from-amber-500 hover:to-red-600"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
                />
              </div>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
                />
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Confirm password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-amber-500 h-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-white bg-gradient-to-r from-amber-400 to-red-500 hover:from-amber-500 hover:to-red-600 shadow-2xl shadow-amber-500/35"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Owner Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        )}

        <p className="text-center mt-6 text-white/20 text-[0.7rem]">
          Education CRM &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
