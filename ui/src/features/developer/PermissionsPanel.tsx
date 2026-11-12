// Technical section → Permissions: what owners and admins may do. The developer may always do
// everything; each switch takes effect for everyone within a few seconds (the server re-reads it).

import { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getApiPayload } from '@/shared/api/response';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { developerAPI, type PermissionKey, type PermissionRole, type Permissions } from './api';

const PERMISSIONS: { key: PermissionKey; title: string; description: string; icon: typeof BadgeDollarSign }[] = [
  {
    key: 'change_group_price',
    title: 'Change group price',
    description: 'The price in the group form and "Change group payment" in Payments → Groups.',
    icon: BadgeDollarSign,
  },
];

const ROLES: { role: PermissionRole; label: string; ariaLabel: string }[] = [
  { role: 'owner', label: 'Owners', ariaLabel: 'Allowed for owners' },
  { role: 'admin', label: 'Admins', ariaLabel: 'Allowed for admins' },
];

export const PermissionsPanel = () => {
  const { t } = useLanguage();
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPermissions(getApiPayload<{ permissions: Permissions }>(await developerAPI.permissions())?.permissions || null);
    } catch {
      // Shown by the API client.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (key: PermissionKey, role: PermissionRole, value: boolean) => {
    setSaving(`${key}:${role}`);
    try {
      const next = getApiPayload<{ permissions: Permissions }>(await developerAPI.setPermission(key, { [role]: value }))?.permissions;
      if (next) setPermissions(next);
      showToast.success(t('Permission saved'));
    } catch {
      // Shown by the API client.
    } finally {
      setSaving(null);
    }
  };

  if (!permissions) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="border-b p-4">
        <h2 className="font-bold">{t('Permissions')}</h2>
        <p className="text-sm text-muted-foreground">{t('Choose what owners and admins may do. You can always do everything.')}</p>
      </div>
      <div className="divide-y">
        {PERMISSIONS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex flex-wrap items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-[200px] flex-1">
                <div className="font-semibold">{t(item.title)}</div>
                <div className="text-sm text-muted-foreground">{t(item.description)}</div>
              </div>
              <div className="flex flex-wrap gap-6">
                {ROLES.map(({ role, label, ariaLabel }) => {
                  const id = `${item.key}-${role}`;
                  return (
                    <label key={role} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <Switch
                        id={id}
                        aria-label={t(ariaLabel)}
                        checked={permissions[item.key][role]}
                        disabled={saving !== null}
                        onCheckedChange={(value) => void toggle(item.key, role, value)}
                      />
                      {t(label)}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
