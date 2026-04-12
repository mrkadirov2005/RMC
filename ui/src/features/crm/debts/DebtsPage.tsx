import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SelectField } from '../students/components/SelectField';
import DebtAnalyzer from './DebtAnalyzer';
import { useDebtsPage } from './hooks/useDebtsPage';

const DebtsPage = () => {
  const {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    studentOptions,
    centerOptions,
    isLoadingOptions,
    isOwner,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    getStudentName,
  } = useDebtsPage();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Debts Management</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Add Debt
        </Button>
      </div>

      <DebtAnalyzer />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Debt Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Debt Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : state.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No debt records found
                    </TableCell>
                  </TableRow>
                ) : (
                  state.items.map((debt) => {
                    const debtAmount = typeof debt.debt_amount === 'string' ? parseFloat(debt.debt_amount) : debt.debt_amount;
                    const amountPaid = typeof debt.amount_paid === 'string' ? parseFloat(debt.amount_paid) : debt.amount_paid;
                    const remaining = debtAmount - amountPaid;
                    return (
                      <TableRow key={debt.debt_id || debt.id}>
                        <TableCell className="font-medium">{getStudentName(debt.student_id)}</TableCell>
                        <TableCell>${debtAmount.toFixed(2)}</TableCell>
                        <TableCell>${amountPaid.toFixed(2)}</TableCell>
                        <TableCell className={cn(remaining > 0 ? 'text-red-600 font-semibold' : 'text-green-600')}>
                          ${remaining.toFixed(2)}
                        </TableCell>
                        <TableCell>{new Date(debt.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(debt)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(debt.debt_id || debt.id || 0)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Debt' : 'Add New Debt'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Student" name="student_id" value={formData.student_id || ''} onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })} options={studentOptions} isLoading={isLoadingOptions} required placeholder="Select a student" />
              {isOwner && <SelectField label="Center" name="center_id" value={formData.center_id || ''} onChange={(e) => setFormData({ ...formData, center_id: Number(e.target.value) })} options={centerOptions} isLoading={isLoadingOptions} required placeholder="Select a center" />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Debt Amount *</Label>
                <Input type="number" required step="0.01" value={formData.debt_amount || ''} onChange={(e) => setFormData({ ...formData, debt_amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Amount Paid *</Label>
                <Input type="number" required step="0.01" value={formData.amount_paid || 0} onChange={(e) => setFormData({ ...formData, amount_paid: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Debt Date *</Label>
                <Input type="date" required value={formData.debt_date || ''} onChange={(e) => setFormData({ ...formData, debt_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="date" required value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.remarks || ''} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" disabled={state.loading}>{state.loading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebtsPage;
