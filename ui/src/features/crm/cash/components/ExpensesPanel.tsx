// Expenses section: an admin records money spent from the till; the month's list below.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { formatMoney } from '@/utils/helpers';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { cashAPI } from '../api';
import { EXPENSE_METHOD_OPTIONS, METHOD_LABELS, formatDay, monthBounds, type CashExpense, type MethodGroup } from '../cashFormat';

const METHOD_GROUP: Record<string, MethodGroup> = { Cash: 'cash', 'Credit Card': 'card', 'Bank Transfer': 'bank' };

export function ExpensesPanel({ date, onChanged }: { date: string; onChanged: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ expense_date: date, amount: '', payment_method: 'Cash', description: '' });
  const [expenses, setExpenses] = useState<CashExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { from, to } = monthBounds(date);

  useEffect(() => setForm((current) => ({ ...current, expense_date: date })), [date]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setExpenses(getApiPayload<CashExpense[]>(await cashAPI.getExpenses(from, to)) || []);
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not load expenses');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0) || !form.description.trim()) {
      showToast.error('Enter the amount and what the money was spent on.');
      return;
    }
    setSaving(true);
    try {
      await cashAPI.createExpense({ ...form, amount, description: form.description.trim() });
      showToast.success('Expense saved');
      setForm((current) => ({ ...current, amount: '', description: '' }));
      await load();
      onChanged();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save the expense');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense: CashExpense) => {
    if (!window.confirm(t('Delete this expense?'))) return;
    try {
      await cashAPI.deleteExpense(expense.expense_id);
      showToast.success('Expense deleted');
      await load();
      onChanged();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not delete the expense');
    }
  };

  const monthTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[150px_160px_170px_1fr_auto] lg:items-end">
        <div className="space-y-1">
          <Label htmlFor="expense-date">{t('Date')}</Label>
          <Input id="expense-date" type="date" required value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="expense-amount">{t("Amount (so'm)")}</Label>
          <Input id="expense-amount" type="number" min="1" step="1" required inputMode="numeric" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="expense-method">{t('Paid from')}</Label>
          <Select value={form.payment_method} onValueChange={(value) => setForm({ ...form, payment_method: value })}>
            <SelectTrigger id="expense-method"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPENSE_METHOD_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{t(option.label)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="expense-description">{t('What it was for')}</Label>
          <Input id="expense-description" required maxLength={500} placeholder={t('e.g. cleaning supplies')} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <Button type="submit" disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          {t('Add expense')}
        </Button>
      </form>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="text-sm font-bold">{t('Expenses this month')}</h2>
          <span className="text-sm font-black tabular-nums text-rose-600">{formatMoney(monthTotal)}</span>
        </div>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : expenses.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{t('No expenses this month.')}</p>
        ) : (
          <ul className="divide-y">
            {expenses.map((expense) => (
              <li key={expense.expense_id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="mr-2 tabular-nums text-muted-foreground">{formatDay(expense.expense_date)}</span>
                  <span className="font-semibold">{expense.description}</span>
                  <span className="text-muted-foreground"> · {t(METHOD_LABELS[METHOD_GROUP[expense.payment_method] || 'other'])}{expense.created_by_name ? ` · ${expense.created_by_name}` : ''}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-black tabular-nums text-rose-600">−{formatMoney(expense.amount)}</span>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={t('Delete expense')} onClick={() => remove(expense)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
