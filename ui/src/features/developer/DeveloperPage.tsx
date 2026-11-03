// The technical section, the developer account's alone: access control (lock any account, owners
// included, or everyone at once; owner accounts), the engineering tools and the request logs.
// Everyone else is sent away by DeveloperRoute (App.tsx) and refused by the server.

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, KeyRound, Loader2, Lock, LockOpen, Plus, Power, ScrollText, Search, Server, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { getApiPayload } from '@/shared/api/response';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAppSelector } from '../crm/hooks';
import { useUrlTab } from '@/shared/hooks/useUrlTab';
import { developerAPI, type DeveloperAccount, type DeveloperLock, type DeveloperOwner, type LockUserType, type Lockdown, type SealStatus } from './api';

const EngineeringPage = lazy(() => import('../crm/server/EngineeringPage'));
const RequestLogsPage = lazy(() => import('../crm/logs/RequestLogsPage'));

const SECTIONS = ['access', 'engineering', 'logs'] as const;
type Section = (typeof SECTIONS)[number];
const SECTION_TABS: { id: Section; label: string; icon: typeof Lock }[] = [
  { id: 'access', label: 'Access control', icon: Lock },
  { id: 'engineering', label: 'Server and database', icon: Server },
  { id: 'logs', label: 'Journals', icon: ScrollText },
];

const TYPES: { id: LockUserType; label: string }[] = [
  { id: 'owner', label: 'Owners' },
  { id: 'superuser', label: 'Admins' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'student', label: 'Students' },
  { id: 'parent', label: 'Parents' },
];

const TYPE_LABEL: Record<LockUserType, string> = {
  owner: 'Owner',
  superuser: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

const fullName = (row: { first_name: string | null; last_name: string | null; username: string | null }) =>
  [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || row.username || '—';

const formatDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
};

type PendingLock = { type: LockUserType; id: number; name: string } | null;

const DeveloperPanel = () => {
  const { t } = useLanguage();

  const [lockdown, setLockdown] = useState<Lockdown>({ enabled: false, reason: null, locked_at: null });
  const [locks, setLocks] = useState<DeveloperLock[]>([]);
  const [type, setType] = useState<LockUserType>('teacher');
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState<DeveloperAccount[]>([]);
  const [searching, setSearching] = useState(false);
  const [owners, setOwners] = useState<DeveloperOwner[]>([]);
  const [busy, setBusy] = useState(false);

  const [pendingLock, setPendingLock] = useState<PendingLock>(null);
  const [reason, setReason] = useState('');
  const [lockdownDialog, setLockdownDialog] = useState(false);
  const [passwordFor, setPasswordFor] = useState<DeveloperOwner | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [addingOwner, setAddingOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '', first_name: '', last_name: '', email: '' });
  const [sealStatus, setSealStatus] = useState<SealStatus | null>(null);

  const loadSeal = useCallback(async () => {
    try {
      setSealStatus(getApiPayload<SealStatus>(await developerAPI.seal()));
    } catch {
      // Shown by the API client.
    }
  }, []);

  const loadLocks = useCallback(async () => {
    try {
      const data = getApiPayload<{ items: DeveloperLock[]; lockdown: Lockdown }>(await developerAPI.locks());
      setLocks(data?.items || []);
      if (data?.lockdown) setLockdown(data.lockdown);
    } catch {
      // Shown by the API client.
    }
  }, []);

  const loadOwners = useCallback(async () => {
    try {
      setOwners(getApiPayload<{ items: DeveloperOwner[] }>(await developerAPI.owners())?.items || []);
    } catch {
      // Shown by the API client.
    }
  }, []);

  const search = useCallback(async () => {
    setSearching(true);
    try {
      setAccounts(getApiPayload<{ items: DeveloperAccount[] }>(await developerAPI.accounts(type, query))?.items || []);
    } catch {
      setAccounts([]);
    } finally {
      setSearching(false);
    }
  }, [type, query]);

  useEffect(() => {
    void loadLocks();
    void loadOwners();
    void loadSeal();
  }, [loadLocks, loadOwners, loadSeal]);

  // Search as you type, after a short pause.
  useEffect(() => {
    const timer = window.setTimeout(() => void search(), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const refresh = () => Promise.all([loadLocks(), loadOwners(), loadSeal(), search()]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      showToast.success(done);
      await refresh();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmLock = async () => {
    if (!pendingLock) return;
    if (await run(() => developerAPI.lock(pendingLock.type, pendingLock.id, reason.trim() || undefined), t('Account locked'))) {
      setPendingLock(null);
    }
  };

  const unlock = (lockType: LockUserType, id: number) => run(() => developerAPI.unlock(lockType, id), t('Account unlocked'));

  const toggleLockdown = async () => {
    const enable = !lockdown.enabled;
    if (await run(() => developerAPI.setLockdown(enable, enable ? reason.trim() || undefined : undefined), enable ? t('The system is closed') : t('The system is open'))) {
      setLockdownDialog(false);
    }
  };

  const resetPassword = async () => {
    if (!passwordFor) return;
    if (await run(() => developerAPI.resetOwnerPassword(passwordFor.owner_id, newPassword), t('Password changed'))) {
      setPasswordFor(null);
    }
  };

  const addOwner = async () => {
    if (await run(() => developerAPI.createOwner(ownerForm), t('Owner added'))) {
      setAddingOwner(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Changed outside the app: the system stays closed for everyone else until this is dealt with */}
      {sealStatus && !sealStatus.intact && (
        <section className="space-y-3 rounded-lg border-2 border-rose-500 bg-rose-50 p-4 text-rose-950 shadow-sm dark:bg-rose-950/40 dark:text-rose-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="space-y-1">
              <div className="font-bold">{t('Someone changed the locks or the developer account straight in the database')}</div>
              <div className="text-sm">{t('The system is closed for everyone but you until you restore your last state or accept the change.')}</div>
              <ul className="list-disc pl-5 text-sm">
                {sealStatus.locks_removed.length > 0 && <li>{t('Locks removed')}: {sealStatus.locks_removed.join(', ')}</li>}
                {sealStatus.locks_added.length > 0 && <li>{t('Locks added')}: {sealStatus.locks_added.join(', ')}</li>}
                {sealStatus.developers_added.length > 0 && <li>{t('Owners made developer')}: ID {sealStatus.developers_added.join(', ')}</li>}
                {sealStatus.developers_removed.length > 0 && <li>{t('Developer accounts removed')}: ID {sealStatus.developers_removed.join(', ')}</li>}
                {sealStatus.developers_changed.length > 0 && <li>{t('Developer login or password changed')}: ID {sealStatus.developers_changed.join(', ')}</li>}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="bg-rose-600 text-white hover:bg-rose-700" disabled={busy} onClick={() => void run(() => developerAPI.restoreSeal(), t('Your last state is back'))}>
              {t('Restore my last state')}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void run(() => developerAPI.acceptSeal(), t('The change is accepted'))}>
              {t('Accept the change')}
            </Button>
          </div>
        </section>
      )}

      {/* Lock on everyone */}
      <section
        className={cn(
          'flex flex-wrap items-center gap-4 rounded-lg border p-4 shadow-sm',
          lockdown.enabled ? 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40' : 'bg-card'
        )}
      >
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', lockdown.enabled ? 'bg-rose-600 text-white' : 'bg-muted text-muted-foreground')}>
          <Power className="h-5 w-5" />
        </div>
        <div className="min-w-[200px] flex-1">
          <div className="font-bold">{lockdown.enabled ? t('The system is closed for everyone') : t('Close the system for everyone')}</div>
          <div className="text-sm text-muted-foreground">
            {lockdown.enabled
              ? `${t('Nobody but you can sign in or use the system.')} ${lockdown.reason ? `“${lockdown.reason}” · ` : ''}${formatDate(lockdown.locked_at)}`
              : t('Owners, admins, teachers, students and parents are all signed out at once. You keep working.')}
          </div>
        </div>
        <Button
          variant={lockdown.enabled ? 'default' : 'destructive'}
          className={lockdown.enabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : undefined}
          disabled={busy}
          onClick={() => {
            setReason('');
            setLockdownDialog(true);
          }}
        >
          {lockdown.enabled ? t('Open the system') : t('Close the system')}
        </Button>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        {/* Find and lock any account */}
        <section className="rounded-lg border bg-card shadow-sm">
          <div className="space-y-3 border-b p-4">
            <h2 className="flex items-center gap-2 font-bold">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              {t('Lock an account')}
            </h2>
            <div className="inline-flex flex-wrap rounded-lg border bg-muted/40 p-1" role="tablist">
              {TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={type === item.id}
                  onClick={() => setType(item.id)}
                  className={cn('rounded-md px-3 py-1.5 text-sm font-semibold', type === item.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search by name or username')} className="pl-9" />
            </div>
          </div>
          <div className="max-h-[480px] divide-y overflow-y-auto">
            {searching && !accounts.length ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : accounts.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t('No accounts found.')}</p>
            ) : (
              accounts.map((account) => (
                <div key={`${account.user_type}-${account.user_id}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <div className="min-w-[160px] flex-1">
                    <div className="flex items-center gap-2 font-semibold">
                      {fullName(account)}
                      {account.locked && <Badge className="bg-rose-600 text-white hover:bg-rose-600">{t('Locked')}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {account.username || '—'} · ID {account.user_id}
                      {account.status ? ` · ${t(account.status)}` : ''}
                      {account.lock_reason ? ` · “${account.lock_reason}”` : ''}
                    </div>
                  </div>
                  {account.locked ? (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => void unlock(account.user_type, account.user_id)}>
                      <LockOpen className="h-4 w-4" />
                      {t('Unlock')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      disabled={busy}
                      onClick={() => {
                        setReason('');
                        setPendingLock({ type: account.user_type, id: account.user_id, name: fullName(account) });
                      }}
                    >
                      <Lock className="h-4 w-4" />
                      {t('Lock')}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Everything locked now */}
        <section className="rounded-lg border bg-card shadow-sm">
          <h2 className="flex items-center gap-2 border-b p-4 font-bold">
            <Lock className="h-4 w-4" />
            {t('Locked accounts')}
            <span className="rounded-full bg-muted px-2 text-xs tabular-nums">{locks.length}</span>
          </h2>
          <div className="max-h-[540px] divide-y overflow-y-auto">
            {locks.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t('Nobody is locked.')}</p>
            ) : (
              locks.map((lock) => (
                <div key={`${lock.user_type}-${lock.user_id}`} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{fullName(lock)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t(TYPE_LABEL[lock.user_type])} · {formatDate(lock.locked_at)}
                      {lock.reason ? ` · “${lock.reason}”` : ''}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void unlock(lock.user_type, lock.user_id)}>
                    {t('Unlock')}
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Owner accounts */}
      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="flex items-center gap-2 font-bold">
            <KeyRound className="h-4 w-4" />
            {t('Owner accounts')}
          </h2>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setOwnerForm({ username: '', password: '', first_name: '', last_name: '', email: '' });
              setAddingOwner(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('Add owner')}
          </Button>
        </div>
        <div className="divide-y">
          {owners.map((owner) => (
            <div key={owner.owner_id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="min-w-[180px] flex-1">
                <div className="flex flex-wrap items-center gap-2 font-semibold">
                  {fullName(owner)}
                  {owner.is_developer && <Badge variant="outline">{t('You')}</Badge>}
                  {owner.is_locked && <Badge className="bg-amber-500 text-white hover:bg-amber-500">{t('Wrong passwords')}</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {owner.username} · {t('Last login')}: {formatDate(owner.last_login) || '—'}
                </div>
              </div>
              {!owner.is_developer && (
                <div className="flex gap-2">
                  {owner.is_locked && (
                    <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => void run(() => developerAPI.unlockOwner(owner.owner_id), t('Account unlocked'))}>
                      <LockOpen className="h-4 w-4" />
                      {t('Unlock')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={busy}
                    onClick={() => {
                      setNewPassword('');
                      setPasswordFor(owner);
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                    {t('New password')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Lock one account */}
      <Dialog open={Boolean(pendingLock)} onOpenChange={(open) => !open && setPendingLock(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Lock this account?')}</DialogTitle>
            <DialogDescription>
              {pendingLock && `${pendingLock.name} — ${t(TYPE_LABEL[pendingLock.type])}`}. {t('They are signed out at once and cannot sign in until you unlock them.')}
            </DialogDescription>
          </DialogHeader>
          <Textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('Reason (only you see it)')} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingLock(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void confirmLock()}>
              {t('Lock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock on everyone */}
      <Dialog open={lockdownDialog} onOpenChange={setLockdownDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lockdown.enabled ? t('Open the system?') : t('Close the system for everyone?')}</DialogTitle>
            <DialogDescription>
              {lockdown.enabled ? t('Everyone who is not locked one by one can sign in again.') : t('Every account but yours is signed out at once and cannot sign in until you open it again.')}
            </DialogDescription>
          </DialogHeader>
          {!lockdown.enabled && <Textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('Reason (only you see it)')} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockdownDialog(false)}>
              {t('Cancel')}
            </Button>
            <Button
              variant={lockdown.enabled ? 'default' : 'destructive'}
              className={lockdown.enabled ? 'bg-emerald-600 text-white hover:bg-emerald-700' : undefined}
              disabled={busy}
              onClick={() => void toggleLockdown()}
            >
              {lockdown.enabled ? t('Open the system') : t('Close the system')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Owner password */}
      <Dialog open={Boolean(passwordFor)} onOpenChange={(open) => !open && setPasswordFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('New password')}</DialogTitle>
            <DialogDescription>{passwordFor ? `${fullName(passwordFor)} (${passwordFor.username})` : ''}</DialogDescription>
          </DialogHeader>
          <Input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t('At least 8 characters')} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordFor(null)}>
              {t('Cancel')}
            </Button>
            <Button disabled={busy || newPassword.length < 8} onClick={() => void resetPassword()}>
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New owner */}
      <Dialog open={addingOwner} onOpenChange={setAddingOwner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Add owner')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['first_name', 'First name', 'text'],
                ['last_name', 'Last name', 'text'],
                ['username', 'Username', 'text'],
                ['email', 'Email', 'email'],
                ['password', 'Password', 'password'],
              ] as const
            ).map(([field, label, inputType]) => (
              <div key={field} className={cn('space-y-1', field === 'password' && 'sm:col-span-2')}>
                <Label htmlFor={`owner-${field}`}>{t(label)}</Label>
                <Input
                  id={`owner-${field}`}
                  type={inputType}
                  autoComplete={field === 'password' ? 'new-password' : 'off'}
                  value={ownerForm[field]}
                  onChange={(event) => setOwnerForm((current) => ({ ...current, [field]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingOwner(false)}>
              {t('Cancel')}
            </Button>
            <Button
              disabled={busy || !ownerForm.username || ownerForm.password.length < 6 || !ownerForm.first_name || !ownerForm.last_name || !ownerForm.email}
              onClick={() => void addOwner()}
            >
              {t('Add owner')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TechnicalSection = () => {
  const { t } = useLanguage();
  const [section, setSection] = useUrlTab<Section>('access', SECTIONS, 'section');

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('Technical section')}
        description={t('Access control, server and database tools, and request logs. Only you see this section.')}
      />
      <div className="inline-flex flex-wrap rounded-lg border bg-muted/40 p-1" role="tablist">
        {SECTION_TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={section === item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold',
                section === item.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.label)}
            </button>
          );
        })}
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Activity className="h-6 w-6 animate-pulse text-primary" />
          </div>
        }
      >
        {section === 'access' && <DeveloperPanel />}
        {section === 'engineering' && <EngineeringPage />}
        {section === 'logs' && <RequestLogsPage />}
      </Suspense>
    </div>
  );
};

// A second guard behind DeveloperRoute: anyone but the developer gets nothing and sends no requests.
const DeveloperPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  if (!user?.is_developer) return null;
  return <TechnicalSection />;
};

export default DeveloperPage;
