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
    <div className="w-full max-w-md mx-auto mt-10">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Payment Access Required</h3>
            <p className="text-sm text-slate-500">Enter your payment password provided by admin.</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Username</label>
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
            <label className="text-sm font-medium text-slate-700">Payment Password</label>
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
          <Button type="submit" className="w-full" disabled={loading}>
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
