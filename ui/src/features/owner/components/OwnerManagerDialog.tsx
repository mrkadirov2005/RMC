// Modal component for the components screen in the owner feature.

import type { ChangeEvent, FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { OWNER_MANAGER_ADMIN_PERMISSION_OPTIONS, OWNER_MANAGER_FIELDS, OWNER_MANAGER_STATUS_OPTIONS } from '../constants';
import { PERMISSION_DESCRIPTIONS } from '../../crm/rbac/permissions';
import type { OwnerManagerFormData, OwnerManagerMeta, OwnerManagerTabType } from '../types';

interface OwnerManagerDialogProps {
  activeTab: OwnerManagerTabType;
  currentMeta: OwnerManagerMeta;
  showForm: boolean;
  editingId: number | null;
  loading: boolean;
  centerOptions: any[];
  formData: OwnerManagerFormData;
  selectedPermissions: string[];
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onPermissionToggle: (permission: string, enabled: boolean) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
}

// Renders the owner manager dialog modal.
export const OwnerManagerDialog = ({
  activeTab,
  currentMeta,
  showForm,
  editingId,
  loading,
  centerOptions,
  formData,
  selectedPermissions,
  onInputChange,
  onPermissionToggle,
  onSubmit,
  onClose,
}: OwnerManagerDialogProps) => {
  const CurrentIcon = currentMeta.icon;
  const fields = OWNER_MANAGER_FIELDS[activeTab];
  const isSuperuser = activeTab === 'superusers';

// Renders field.
  const renderField = (field: { name: string; label: string; type: string; required?: boolean }) => {
    const value = String(formData[field.name] ?? '');

    if (field.name === 'branch_id' || field.name === 'center_id') {
      const centerFieldName = field.name;
      return (
        <select
          id={centerFieldName}
          name={centerFieldName}
          value={value}
          onChange={onInputChange}
          required={field.required}
          disabled={loading || !centerOptions.length || (centerFieldName === 'branch_id' && editingId != null)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">{centerOptions.length ? 'Select a branch' : 'No branches available'}</option>
          {centerOptions.map((center: any) => {
            const centerId = Number(center.center_id || center.id);
            return (
              <option key={centerId} value={centerId}>
                {center.center_name || center.name || `Center ${centerId}`}
              </option>
            );
          })}
        </select>
      );
    }

    if (field.name === 'role' && isSuperuser) {
      return (
        <select
          id={field.name}
          name={field.name}
          value={String(formData.role || 'admin')}
          onChange={onInputChange}
          required
          disabled={loading}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="admin">admin</option>
        </select>
      );
    }

    if (field.name === 'status') {
      return (
        <select
          id={field.name}
          name={field.name}
          value={value}
          onChange={onInputChange}
          required={field.required}
          disabled={loading}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select status</option>
          {OWNER_MANAGER_STATUS_OPTIONS[activeTab].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'password') {
      return (
        <>
          <Input
            id={field.name}
            name={field.name}
            type="password"
            value={value}
            onChange={onInputChange}
            required={field.required && editingId == null}
            disabled={loading}
            placeholder={editingId ? 'Leave blank to keep current password' : undefined}
          />
          {editingId && <p className="text-xs text-muted-foreground">Leave blank to keep the current password.</p>}
        </>
      );
    }

    return (
      <Input
        id={field.name}
        name={field.name}
        type={field.type}
        value={value}
        onChange={onInputChange}
        required={field.required && !(field.name === 'password' && editingId != null)}
        disabled={loading}
      />
    );
  };

  return (
    <Dialog
      open={showForm}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-white/10 bg-slate-950 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CurrentIcon className="h-5 w-5 text-amber-300" />
            {editingId ? 'Edit' : 'Add New'} {currentMeta.label.slice(0, -1)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name} className="text-white/75">
                  {field.label}
                  {field.required ? ' *' : ''}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </div>

          {isSuperuser && (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Admin permissions</h3>
                <p className="mt-1 text-sm text-white/60">
                  Choose which navbar items and sections this branch admin can see.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {OWNER_MANAGER_ADMIN_PERMISSION_OPTIONS.map((option) => {
                  const checked = selectedPermissions.includes(option.code);
                  return (
                    <label
                      key={option.code}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 transition-colors hover:border-amber-400/30 hover:bg-slate-950/60"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => onPermissionToggle(option.code, event.target.checked)}
                        disabled={loading}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-amber-400 focus:ring-amber-400"
                      />
                      <div className="space-y-1">
                        <p className="font-medium text-white">{option.label}</p>
                        <p className="text-xs leading-5 text-white/55">
                          {PERMISSION_DESCRIPTIONS[option.code] || option.code}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-400 text-slate-950 hover:bg-amber-300"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
