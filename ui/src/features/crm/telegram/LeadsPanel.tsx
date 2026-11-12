// One lead list: people waiting for a suitable group, or gathered for a new group. Whoever is due
// a call back today (or overdue) is marked red at the top.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
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
import { ALL, NO_SUBJECT, filterLeads, levelOptions, subjectTabs } from './leadFilters';
import { subjectAPI } from '@/shared/api/api';
import { unwrapApiRows } from '@/shared/api/response';
import { buildSubjectCatalog } from '../subjects/subjectCatalog';
import { levelsAPI } from '../subjects/levels';

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

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
  const [subjectTab, setSubjectTab] = useState(ALL);
  const [levelFilter, setLevelFilter] = useState(ALL);
  // The center's subjects and the chosen subject's levels, so new leads use the standard names.
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [formLevels, setFormLevels] = useState<string[]>([]);

  useEffect(() => {
    subjectAPI.getAll()
      .then((res) => setSubjects(buildSubjectCatalog(unwrapApiRows<any>(res))
        .map((subject: any) => ({ id: Number(subject.subject_id), name: String(subject.subject_name || '').trim() }))
        .filter((subject) => subject.id > 0 && subject.name)
        .sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setSubjects([]));
  }, []);

  const formSubject = subjects.find((subject) => subject.name.toLowerCase() === form.subject.trim().toLowerCase());
  useEffect(() => {
    if (!formSubject) { setFormLevels([]); return; }
    let cancelled = false;
    levelsAPI.forSubject(formSubject.id)
      .then((res) => { if (!cancelled) setFormLevels((getApiPayload<any>(res)?.levels || []).map((level: any) => String(level.level_name))); })
      .catch(() => { if (!cancelled) setFormLevels([]); });
    return () => { cancelled = true; };
  }, [formSubject?.id]);

  const tabs = useMemo(() => subjectTabs(rows), [rows]);
  const levels = useMemo(() => levelOptions(rows, subjectTab), [rows, subjectTab]);
  const shownRows = useMemo(() => filterLeads(rows, subjectTab, levelFilter), [rows, subjectTab, levelFilter]);
  useEffect(() => {
    if (subjectTab !== ALL && !tabs.some((tab) => tab.key === subjectTab)) setSubjectTab(ALL);
  }, [subjectTab, tabs]);

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
            ['full_name', 'Full name', true], ['phone', 'Phone', true], ['parent_phone', 'Parent phone', false],
          ] as const).map(([name, label, required]) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={`lead-${name}`}>{t(label)}{required ? ' *' : ''}</Label>
              <Input id={`lead-${name}`} maxLength={255} {...field(name)} />
            </div>
          ))}
          <div className="space-y-1">
            <Label htmlFor="lead-subject">{t('Subject')}</Label>
            <select id="lead-subject" className={SELECT_CLASS} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value, level: '' })}>
              <option value="">{t('Choose a subject')}</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.name}>{subject.name}</option>)}
              {form.subject && !formSubject && <option value={form.subject}>{form.subject}</option>}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-level">{t('Level')}</Label>
            {formLevels.length > 0 ? (
              <select id="lead-level" className={SELECT_CLASS} value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                <option value="">{t('Choose a level')}</option>
                {formLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                {form.level && !formLevels.includes(form.level) && <option value={form.level}>{form.level}</option>}
              </select>
            ) : (
              <Input id="lead-level" maxLength={255} {...field('level')} />
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-preferred_time">{t('Preferred days and time')}</Label>
            <Input id="lead-preferred_time" maxLength={255} {...field('preferred_time')} />
          </div>
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

      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('Subject')}>
            {[{ key: ALL, label: t('All subjects'), count: rows.length }, ...tabs.map((tab) => ({ ...tab, label: tab.key === NO_SUBJECT ? t('No subject') : tab.label }))].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={subjectTab === tab.key}
                onClick={() => { setSubjectTab(tab.key); setLevelFilter(ALL); }}
                className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition',
                  subjectTab === tab.key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}
              >
                {tab.label}
                <span className={cn('rounded-full px-1.5 tabular-nums', subjectTab === tab.key ? 'bg-primary-foreground/20' : 'bg-muted')}>{tab.count}</span>
              </button>
            ))}
          </div>
          {levels.length > 0 && (
            <select aria-label={t('Level')} className={cn(SELECT_CLASS, 'h-8 w-auto text-xs')} value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
              <option value={ALL}>{t('All levels')}</option>
              {levels.map((level) => <option key={level.key} value={level.key}>{level.label} ({level.count})</option>)}
            </select>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('Nobody here yet.')}</p>
      ) : shownRows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('Nobody for this subject and level.')}</p>
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
              {shownRows.map((lead) => (
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
