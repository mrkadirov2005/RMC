import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface TeacherAccountPasswordCardProps {
  newPassword: string;
  setNewPassword: (value: string) => void;
  settingPassword: boolean;
  onSetPassword: () => void;
}

export const TeacherAccountPasswordCard = ({
  newPassword,
  setNewPassword,
  settingPassword,
  onSetPassword,
}: TeacherAccountPasswordCardProps) => (
  <Card className="rounded-lg border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
    <CardHeader className="p-3 pb-1">
      <CardTitle className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
        <KeyRound className="h-4 w-4" />
        Account Password
      </CardTitle>
    </CardHeader>
    <CardContent className="grid gap-2 p-3 pt-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="teacher-new-password" className="text-xs">New Password</Label>
        <Input
          id="teacher-new-password"
          type="password"
          className="h-8 text-xs"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSetPassword();
          }}
          placeholder="Enter new password"
          disabled={settingPassword}
        />
      </div>
      <Button className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={onSetPassword} disabled={settingPassword || !newPassword.trim()}>
        {settingPassword ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <KeyRound className="mr-1.5 h-3.5 w-3.5" />}
        Update Password
      </Button>
    </CardContent>
  </Card>
);

interface TeacherPaymentPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentTempPassword: string;
  setPaymentTempPassword: (value: string) => void;
  settingPaymentPassword: boolean;
  onGeneratePassword: () => void;
  onCopyPassword: () => void;
  onSavePassword: () => void;
}

export const TeacherPaymentPasswordDialog = ({
  open,
  onOpenChange,
  paymentTempPassword,
  setPaymentTempPassword,
  settingPaymentPassword,
  onGeneratePassword,
  onCopyPassword,
  onSavePassword,
}: TeacherPaymentPasswordDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-lg sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-base">Set Payment Password</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <Alert className="py-3">
          <AlertDescription>
            This password is used for the teacher&apos;s separate Payments login (required to access the Payments tab).
          </AlertDescription>
        </Alert>
        <div className="space-y-1">
          <Label htmlFor="payment-password" className="text-xs">Payment Password</Label>
          <Input
            id="payment-password"
            type="text"
            className="h-8 text-xs"
            value={paymentTempPassword}
            onChange={(e) => setPaymentTempPassword(e.target.value)}
            placeholder="Enter or generate a password"
            disabled={settingPaymentPassword}
          />
          <div className="flex gap-1.5">
            <Button type="button" size="sm" className="h-8 bg-amber-500 text-xs text-white hover:bg-amber-600" onClick={onGeneratePassword} disabled={settingPaymentPassword}>
              Generate
            </Button>
            <Button type="button" size="sm" className="h-8 bg-cyan-600 text-xs text-white hover:bg-cyan-700" onClick={onCopyPassword} disabled={!paymentTempPassword || settingPaymentPassword}>
              Copy
            </Button>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button size="sm" className="h-8 bg-slate-700 text-xs text-white hover:bg-slate-800" onClick={() => onOpenChange(false)} disabled={settingPaymentPassword}>
          Cancel
        </Button>
        <Button size="sm" className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={onSavePassword} disabled={settingPaymentPassword}>
          {settingPaymentPassword ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Password'
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface TeacherTemporaryPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempPassword: string;
  onCopyPassword: () => void;
}

export const TeacherTemporaryPasswordDialog = ({
  open,
  onOpenChange,
  tempPassword,
  onCopyPassword,
}: TeacherTemporaryPasswordDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-lg">
      <DialogHeader>
        <DialogTitle className="text-base">Temporary Password</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="teacher-temp-password" className="text-xs">Share this password with the teacher.</Label>
        <div className="flex gap-2">
          <Input id="teacher-temp-password" className="h-8 text-xs" value={tempPassword} readOnly />
          <Button size="sm" className="h-8 bg-cyan-600 text-xs text-white hover:bg-cyan-700" onClick={onCopyPassword}>
            Copy
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button size="sm" className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={() => onOpenChange(false)}>Done</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
