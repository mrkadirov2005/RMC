// Page component for the debts screen in the crm feature.

import { useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, Loader2, Search, X } from 'lucide-react';
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
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';

// Renders the debts page screen.
const DebtsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useLanguage();
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
  const filteredDebts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return state.items;

    return state.items.filter((debt) =>
      [
        getStudentName(debt.student_id),
        debt.debt_amount,
        debt.amount_paid,
        debt.debt_date,
        debt.due_date,
        debt.remarks,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [getStudentName, searchTerm, state.items]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('Debts Management')}</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> {t('Add Debt')}
        </Button>
      </div>

      <DebtAnalyzer />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('Search debts by student, amount, date, remarks...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setSearchTerm('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Debt Records')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Student Name')}</TableHead>
                  <TableHead>{t('Debt Amount')}</TableHead>
                  <TableHead>{t('Paid Amount')}</TableHead>
                  <TableHead>{t('Remaining')}</TableHead>
                  <TableHead>{t('Due Date')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredDebts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? t('No debt records match your search') : t('No debt records found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDebts.map((debt) => {
                    const debtAmount = typeof debt.debt_amount === 'string' ? parseFloat(debt.debt_amount) : debt.debt_amount;
                    const amountPaid = typeof debt.amount_paid === 'string' ? parseFloat(debt.amount_paid) : debt.amount_paid;
                    const remaining = debtAmount - amountPaid;
                    return (
                      <TableRow key={debt.debt_id || debt.id}>
                        <TableCell className="font-medium">{getStudentName(debt.student_id)}</TableCell>
                        <TableCell>{formatMoney(debtAmount)}</TableCell>
                        <TableCell>{formatMoney(amountPaid)}</TableCell>
                        <TableCell className={cn(remaining > 0 ? 'text-red-600 font-semibold' : 'text-green-600')}>
                          {formatMoney(remaining)}
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
            <DialogTitle>{editingId ? t('Edit Debt') : t('Add New Debt')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectField label={t('Student')} name="student_id" value={formData.student_id || ''} onChange={(value) => setFormData({ ...formData, student_id: Number(value) })} options={studentOptions} isLoading={isLoadingOptions} required placeholder={t('Select a student')} />
              {isOwner && <SelectField label={t('Center')} name="center_id" value={formData.center_id || ''} onChange={(value) => setFormData({ ...formData, center_id: Number(value) })} options={centerOptions} isLoading={isLoadingOptions} required placeholder={t('Select a center')} />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Debt Amount')} *</Label>
                <Input type="number" required step="0.01" value={formData.debt_amount || ''} onChange={(e) => setFormData({ ...formData, debt_amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Amount Paid')} *</Label>
                <Input type="number" required step="0.01" value={formData.amount_paid || 0} onChange={(e) => setFormData({ ...formData, amount_paid: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Debt Date')} *</Label>
                <Input type="date" required value={formData.debt_date || ''} onChange={(e) => setFormData({ ...formData, debt_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Due Date')} *</Label>
                <Input type="date" required value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Remarks')}</Label>
              <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.remarks || ''} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>{t('Cancel')}</Button>
              <Button type="submit" disabled={state.loading}>{state.loading ? t('Saving...') : t('Save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebtsPage;
