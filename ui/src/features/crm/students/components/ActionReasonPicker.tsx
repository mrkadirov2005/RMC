// Reason dropdown shared by the student transfer and delete flows.

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { studentsApi } from '../api/studentsApi';

export type ReasonType = 'transfer' | 'delete';

export const CUSTOM_REASON_VALUE = -1;

export const isReasonReady = (reasonId: string, customReason: string) => {
  if (!reasonId) return false;
  if (Number(reasonId) === CUSTOM_REASON_VALUE) return customReason.trim().length > 0;
  return true;
};

export const resolveReasonId = async (reasonType: ReasonType, reasonId: string, customReason: string) => {
  if (Number(reasonId) !== CUSTOM_REASON_VALUE) return Number(reasonId);
  const created = await studentsApi.createActionReason(reasonType, customReason.trim());
  return Number(created.data?.reason_id);
};

interface Props {
  reasonType: ReasonType;
  open: boolean;
  value: string;
  customValue: string;
  onChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  disabled?: boolean;
}

// Renders the action reason picker.
export const ActionReasonPicker = ({ reasonType, open, value, customValue, onChange, onCustomChange, disabled = false }: Props) => {
  const [options, setOptions] = useState<Array<{ value: number; label: string }>>([]);

  useEffect(() => {
    if (!open) return;
    studentsApi.getActionReasons(reasonType).then((response) => {
      const rows = Array.isArray(response.data) ? response.data : [];
      setOptions(rows.map((row: any) => ({ value: Number(row.reason_id), label: row.reason_name })));
    }).catch(() => setOptions([]));
  }, [open, reasonType]);

  const fieldId = `${reasonType}-reason`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>Reason</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder="Select a reason" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}
          <SelectItem value={String(CUSTOM_REASON_VALUE)}>+ Add a custom reason</SelectItem>
        </SelectContent>
      </Select>
      {Number(value) === CUSTOM_REASON_VALUE && (
        <Input
          value={customValue}
          onChange={(event) => onCustomChange(event.target.value)}
          disabled={disabled}
          placeholder="Enter your own reason"
        />
      )}
    </div>
  );
};
