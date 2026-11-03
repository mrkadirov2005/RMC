// "My password" for owner accounts and the developer: the current password, then the new one twice.
// The server changes only the signed-in account's own password (and re-signs the developer seal).

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ownerAPI } from '@/shared/api/api';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAppSelector } from '../../crm/hooks';

export const MIN_OWN_PASSWORD_LENGTH = 8;

export const ChangeOwnPasswordCard = () => {
  const { t } = useLanguage();
  const user = useAppSelector((state) => state.auth.user);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user || String(user.role || '').toLowerCase() !== 'owner') return null;

  const tooShort = next.length > 0 && next.length < MIN_OWN_PASSWORD_LENGTH;
  const mismatch = repeat.length > 0 && next !== repeat;
  const sameAsCurrent = next.length > 0 && next === current;
  const ready = current.length > 0 && next.length >= MIN_OWN_PASSWORD_LENGTH && next === repeat && !sameAsCurrent;

  const save = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await ownerAPI.changePassword(Number(user.id), { old_password: current, new_password: next });
      showToast.success(t('Your password has been changed'));
      setCurrent('');
      setNext('');
      setRepeat('');
    } catch {
      // Shown by the API client (a wrong current password says so).
    } finally {
      setSaving(false);
    }
  };

  const field = (id: string, label: string, value: string, onChange: (value: string) => void, autoComplete: string) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{t(label)}</Label>
      <Input id={id} type="password" autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 font-bold">
        <KeyRound className="h-4 w-4" />
        {t('My password')}
      </h2>
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {field('own-current-password', 'Current password', current, setCurrent, 'current-password')}
        {field('own-new-password', 'New password', next, setNext, 'new-password')}
        {field('own-repeat-password', 'Repeat new password', repeat, setRepeat, 'new-password')}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <Button type="submit" disabled={!ready || saving}>
            {t('Change password')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {tooShort
              ? t('At least {count} characters', { count: MIN_OWN_PASSWORD_LENGTH })
              : mismatch
                ? t('The new passwords do not match')
                : sameAsCurrent
                  ? t('The new password is the same as the current one')
                  : ''}
          </span>
        </div>
      </form>
    </section>
  );
};
