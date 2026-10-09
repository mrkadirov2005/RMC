// One lead list: people waiting for a suitable group, or gathered for a new group. Whoever is due
// a call back today (or overdue) is marked red at the top.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Pencil, Phone, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { leadAPI, type LeadStage } from './api';

type Lead = {
  lead_id: number; stage: LeadStage; full_name: string; phone: string; parent_phone?: string | null; subject?: string | null;
  level?: string | null; preferred_time?: string | null; note?: string | null; call_back_on?: string | null; call_back_due: boolean; created_by_name?: string | null;
};

const EMPTY = { full_name: '', phone: '', parent_phone: '', subject: '', level: '', preferred_time: '', call_back_on: '', note: '' };
const OTHER_STAGE: Record<LeadStage, LeadStage> = { waiting_group: 'new_group', new_group: 'waiting_group' };
const day = (value?: string | null) => (value ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}` : '—');

export function LeadsPanel({ stage, onChanged }: { stage: LeadStage; onChanged?: () => void }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(getApiPayload<Lead[]>(await leadAPI.getAll(stage)) || []);
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not load the list');
    } finally {
      setLoading(false);
    }
  }, [stage]);

  useEffect(() => { void load(); }, [load]);

  const refresh = async () => { await load(); onChanged?.(); };
  const field = (name: keyof typeof EMPTY) => ({ value: form[name], onChange: (event: { target: { value: string } }) => setForm({ ...form, [name]: event.target.value }) });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim()) {
      showToast.error('Enter the name and phone number.');
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, stage };
      if (editingId) await leadAPI.update(editingId, data);
      else await leadAPI.create(data);
      showToast.success('Saved');
      setForm(EMPTY);
      setEditingId(null);
      setShowForm(false);
      await refresh();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const edit = (lead: Lead) => {
    setEditingId(lead.lead_id);
    setShowForm(true);
    setForm({
      full_name: lead.full_name, phone: lead.phone, parent_phone: lead.parent_phone || '', subject: lead.subject || '', level: lead.level || '',
      preferred_time: lead.preferred_time || '', call_back_on: lead.call_back_on || '', note: lead.note || '',
    });
  };

  const move = async (lead: Lead) => {
    try {
      await leadAPI.update(lead.lead_id, { ...lead, stage: OTHER_STAGE[stage] });
      showToast.success('Moved');
      await refresh();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save');
    }
  };

  const close = async (lead: Lead, outcome: 'enrolled' | 'lost') => {
    const note = window.prompt(t(outcome === 'enrolled' ? 'Which group did {name} join?' : 'Why is {name} not coming?', { name: lead.full_name }));
    if (note === null) return;
    try {
      await leadAPI.close(lead.lead_id, outcome, note);
      showToast.success(outcome === 'enrolled' ? 'Marked as joined a group' : 'Marked as not coming');
      await refresh();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!showForm && <Button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); setShowForm(true); }}><Plus className="mr-1.5 h-4 w-4" />{t('Add person')}</Button>}
      </div>
      {showForm && (
        <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['full_name', 'Full name', true], ['phone', 'Phone', true], ['parent_phone', 'Parent phone', false], ['subject', 'Subject', false],
            ['level', 'Level', false], ['preferred_time', 'Preferred days and time', false],
          ] as const).map(([name, label, required]) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={`lead-${name}`}>{t(label)}{required ? ' *' : ''}</Label>
              <Input id={`lead-${name}`} maxLength={255} {...field(name)} />
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="lead-call_back_on">{t('Call back on')}</Label>
            <Input id="lead-call_back_on" type="date" {...field('call_back_on')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-note">{t('Note')}</Label>
            <Input id="lead-note" maxLength={2000} {...field('note')} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{t('Save')}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>{t('Cancel')}</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('Nobody here yet.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Name')}</TableHead>
                <TableHead>{t('Phone')}</TableHead>
                <TableHead>{t('Subject and level')}</TableHead>
                <TableHead>{t('Preferred days and time')}</TableHead>
                <TableHead>{t('Call back on')}</TableHead>
                <TableHead>{t('Note')}</TableHead>
                <TableHead className="w-44" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lead) => (
                <TableRow key={lead.lead_id} className={cn(lead.call_back_due && 'bg-rose-50/80 dark:bg-rose-950/30')} data-testid="lead-row">
                  <TableCell className="font-semibold">{lead.full_name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:underline"><Phone className="h-3.5 w-3.5" />{lead.phone}</a>
                    {lead.parent_phone && <div className="text-xs text-muted-foreground">{lead.parent_phone}</div>}
                  </TableCell>
                  <TableCell>{[lead.subject, lead.level].filter(Boolean).join(' · ') || '—'}</TableCell>
                  <TableCell>{lead.preferred_time || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {day(lead.call_back_on)}
                    {lead.call_back_due && <span className="ml-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{t('Call today')}</span>}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal text-xs text-muted-foreground">{lead.note || '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('Edit')} onClick={() => edit(lead)}><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => move(lead)}>
                        {t(stage === 'waiting_group' ? 'To new group list' : 'To waiting list')}
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" aria-label={t('Joined a group')} onClick={() => close(lead, 'enrolled')}><CheckCircle2 className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-rose-600" aria-label={t('Not coming')} onClick={() => close(lead, 'lost')}><XCircle className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
