import { useState } from 'react';
import { AlertTriangle, DatabaseZap, RotateCcw, ServerCog } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { systemAPI } from '@/shared/api/api';
import { showToast } from '@/utils/toast';
import { useLanguage } from '../../../i18n/LanguageContext';

const RESET_CONFIRMATION = 'TRUNCATE_EDUCATION_DATA';

type ResetTarget = {
  key: 'students' | 'teachers' | 'classes';
  label: string;
  endpoint: (confirmation: string) => Promise<any>;
};

const resetTargets: ResetTarget[] = [
  { key: 'students', label: 'Students', endpoint: systemAPI.resetStudents },
  { key: 'teachers', label: 'Teachers', endpoint: systemAPI.resetTeachers },
  { key: 'classes', label: 'Classes', endpoint: systemAPI.resetClasses },
];

export const OwnerSystemSettings = () => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const { t } = useLanguage();

  const close = () => {
    setOpen(false);
    setPassword('');
    setSubmitting(false);
  };

  const closeReset = () => {
    setResetTarget(null);
    setResetConfirmation('');
    setResetSubmitting(false);
  };

  const redeploy = async () => {
    if (!password.trim()) {
      showToast.error(t('Redeploy password is required.'));
      return;
    }

    setSubmitting(true);
    try {
      await systemAPI.redeploy(password);
      showToast.success(t('Server redeploy started.'));
      close();
    } catch {
      showToast.error(t('Could not start server redeploy.'));
      setSubmitting(false);
    }
  };

  const resetTable = async () => {
    if (!resetTarget) return;
    if (resetConfirmation !== RESET_CONFIRMATION) {
      showToast.error(`Type ${RESET_CONFIRMATION} to confirm.`);
      return;
    }

    setResetSubmitting(true);
    try {
      const response = await resetTarget.endpoint(resetConfirmation);
      const data = (response as any).data ?? response;
      const before = Number(data?.before ?? 0);
      showToast.success(`${resetTarget.label} table cleared. Removed ${before.toLocaleString()} row${before === 1 ? '' : 's'}.`);
      closeReset();
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || `Could not clear ${resetTarget.label.toLowerCase()} table.`);
      setResetSubmitting(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ServerCog className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            {t('Owner system settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{t('Redeploy server')}</p>
            <p className="text-sm text-slate-600 dark:text-white/65">
              {t('Runs the configured redeploy script after confirming the password from the backend .env file.')}
            </p>
          </div>
          <Button type="button" variant="outline" className="gap-2 border-amber-300 bg-white dark:bg-background" onClick={() => setOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            {t('Redeploy')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DatabaseZap className="h-5 w-5 text-red-600 dark:text-red-300" />
            Dev data reset
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="bg-white/70 dark:bg-background/40">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Clears the selected table with cascade and restarts its IDs. This endpoint is disabled in production by the backend.
            </AlertDescription>
          </Alert>
          <div className="grid gap-2 sm:grid-cols-3">
            {resetTargets.map((target) => (
              <Button
                key={target.key}
                type="button"
                variant="outline"
                className="justify-start gap-2 border-red-300 bg-white text-red-700 hover:bg-red-100 hover:text-red-800 dark:bg-background dark:text-red-300"
                onClick={() => setResetTarget(target)}
              >
                <DatabaseZap className="h-4 w-4" />
                Clear {target.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('Confirm server redeploy')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('Enter the redeploy password from')} <span className="font-semibold text-foreground">SERVER_REDEPLOY_PASSWORD</span>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="redeploy-password">{t('Redeploy password')}</Label>
              <Input
                id="redeploy-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void redeploy();
                  }
                }}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={submitting}>
              {t('Cancel')}
            </Button>
            <Button type="button" className="bg-amber-500 text-white hover:bg-amber-600" onClick={redeploy} disabled={submitting}>
              {submitting ? t('Starting...') : t('Start redeploy')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onOpenChange={(nextOpen) => !nextOpen && closeReset()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Clear {resetTarget?.label} table
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will truncate {resetTarget?.label.toLowerCase()} and any dependent records through cascade.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="reset-confirmation">
                Type <span className="font-semibold text-foreground">{RESET_CONFIRMATION}</span>
              </Label>
              <Input
                id="reset-confirmation"
                value={resetConfirmation}
                onChange={(event) => setResetConfirmation(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void resetTable();
                  }
                }}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeReset} disabled={resetSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={resetTable}
              disabled={resetSubmitting || resetConfirmation !== RESET_CONFIRMATION}
            >
              {resetSubmitting ? 'Clearing...' : `Clear ${resetTarget?.label || 'table'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
