// Confirmation dialog collecting the reason before a student delete.

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionReasonPicker, isReasonReady, resolveReasonId } from './ActionReasonPicker';
import { useLanguage } from '@/i18n/LanguageContext';

interface Props {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reasonId: number, note?: string) => Promise<void> | void;
  confirmLabel?: string;
}

// Renders the delete student dialog.
export const DeleteStudentDialog = ({ open, title, description, onOpenChange, onConfirm, confirmLabel }: Props) => {
  const { t } = useLanguage();
  const [reasonId, setReasonId] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [note, setNote] = useState('');
  const [needsNote, setNeedsNote] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) return;
    setReasonId('');
    setCustomReason('');
    setNote('');
  }, [open]);

  const ready = isReasonReady(reasonId, customReason) && (!needsNote || note.trim().length > 0);

  const confirm = async () => {
    if (!ready) return;
    setDeleting(true);
    try {
      const resolvedId = await resolveReasonId('delete', reasonId, customReason);
      await onConfirm(resolvedId, note.trim() || undefined);
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
          allowCustom={false}
          note={note}
          onNoteChange={setNote}
          onNeedsNoteChange={setNeedsNote}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            {t('Cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={deleting || !ready}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? t('Deleting...') : t(confirmLabel || 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
