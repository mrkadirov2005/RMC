// Source file for the payments area in the crm feature.

import { useState } from 'react';
import { ShieldCheck, KeyRound, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { authAPI } from '../../../../shared/api/api';
import {
  initializePaymentAccess,
  paymentLoginFailure,
  paymentLoginSuccess,
  setPaymentLoading,
} from '../../../../slices/paymentAccessSlice';
import { showToast, handleApiError } from '../../../../utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/utils/errorMessage';

// Renders the payment access gate module.
export const PaymentAccessGate = () => {
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.paymentAccess);
  const { user } = useAppSelector((state) => state.auth);
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');

// Handles login.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setPaymentLoading(true));
    try {
      const response = await authAPI.loginTeacherPayment({ username, password });
      dispatch(paymentLoginSuccess({ token: response.data.token }));
      dispatch(initializePaymentAccess());
      showToast.success('Payment access granted');
    } catch (err: any) {
      const msg = handleApiError(err);
      dispatch(paymentLoginFailure(msg));
      showToast.error(msg);
    } finally {
      dispatch(setPaymentLoading(false));
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md px-4">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/75 to-sky-50/65 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 dark:hidden" />
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-900/10 dark:shadow-none">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950 dark:text-foreground">Payment Access Required</h3>
            <p className="text-sm text-muted-foreground">Enter your payment password provided by admin.</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-foreground">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              disabled={loading}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-foreground">Payment Password</label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Payment password"
              type="password"
              autoComplete="current-password"
              disabled={loading}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 mr-2" />
                Unlock Payments
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
