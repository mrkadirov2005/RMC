import { useState } from 'react';
import { AlertTriangle, RotateCcw, ServerCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { systemAPI } from '@/shared/api/api';
import { showToast } from '@/utils/toast';

export const OwnerSystemSettings = () => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword('');
    setSubmitting(false);
  };

  const redeploy = async () => {
    if (!password.trim()) {
      showToast.error('Redeploy password is required.');
      return;
    }

    setSubmitting(true);
    try {
      await systemAPI.redeploy(password);
      showToast.success('Server redeploy started.');
      close();
    } catch {
      showToast.error('Could not start server redeploy.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ServerCog className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            Owner system settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Redeploy server</p>
            <p className="text-sm text-slate-600 dark:text-white/65">
              Runs the configured redeploy script after confirming the password from the backend .env file.
            </p>
          </div>
          <Button type="button" variant="outline" className="gap-2 border-amber-300 bg-white dark:bg-background" onClick={() => setOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            Redeploy
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm server redeploy
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the redeploy password from <span className="font-semibold text-foreground">SERVER_REDEPLOY_PASSWORD</span>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="redeploy-password">Redeploy password</Label>
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
              Cancel
            </Button>
            <Button type="button" className="bg-amber-500 text-white hover:bg-amber-600" onClick={redeploy} disabled={submitting}>
              {submitting ? 'Starting...' : 'Start redeploy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
