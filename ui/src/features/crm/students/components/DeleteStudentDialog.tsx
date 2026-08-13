// Confirmation dialog collecting the reason before a student delete.

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionReasonPicker, isReasonReady, resolveReasonId } from './ActionReasonPicker';

interface Props {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonId: number) => Promise<void> | void;
}

// Renders the delete student dialog.
export const DeleteStudentDialog = ({ open, title, description, onOpenChange, onConfirm }: Props) => {
  const [reasonId, setReasonId] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) return;
    setReasonId('');
    setCustomReason('');
  }, [open]);

  const confirm = async () => {
    if (!isReasonReady(reasonId, customReason)) return;
    setDeleting(true);
    try {
      const resolvedId = await resolveReasonId('delete', reasonId, customReason);
      await onConfirm(resolvedId);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (deleting ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ActionReasonPicker
          reasonType="delete"
          open={open}
          value={reasonId}
          customValue={customReason}
          onChange={setReasonId}
          onCustomChange={setCustomReason}
          disabled={deleting}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={deleting || !isReasonReady(reasonId, customReason)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
