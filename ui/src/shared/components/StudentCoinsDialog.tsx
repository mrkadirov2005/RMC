import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { studentAPI } from '@/shared/api/api';

interface StudentCoinsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: number;
  studentName?: string;
  currentCoins?: number;
  onSaved?: () => void;
}

export const StudentCoinsDialog = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  currentCoins,
  onSaved,
}: StudentCoinsDialogProps) => {
  const [direction, setDirection] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setDirection('add');
      setAmount('');
      setReason('');
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!studentId) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount === 0) return;
    setSaving(true);
    try {
      await studentAPI.addCoins(studentId, {
        amount: numericAmount,
        direction,
        reason: reason.trim() ? reason.trim() : null,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update coins:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Coins {studentName ? `- ${studentName}` : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-lg font-semibold">{Number(currentCoins || 0).toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={direction} onValueChange={(value) => setDirection(value as 'add' | 'subtract')}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add coins</SelectItem>
                <SelectItem value="subtract">Subtract coins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coin-amount">Amount</Label>
            <Input
              id="coin-amount"
              type="number"
              min="1"
              step="1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coin-reason">Reason (optional)</Label>
            <Input
              id="coin-reason"
              placeholder="Reason for adjustment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !studentId || !amount}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
