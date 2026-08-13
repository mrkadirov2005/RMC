import { useState } from 'react';
import { Loader2, PencilLine, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getListRowBackground } from '../../settings/listAppearance';
import { teacherAPI } from '../requests';
import { showToast } from '@/utils/toast';
import { getErrorMessage } from '@/utils/errorMessage';
import { buildTeacherOverviewColumns, buildTeacherOverviewUpdate, createTeacherOverviewDraft, TEACHER_OVERVIEW_FIELDS, type TeacherOverviewDraft } from '../teacherOverview';

export default function TeacherInfoTab({ teacher, onRefresh }: { teacher: any; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<TeacherOverviewDraft | null>(null);
  const columns = buildTeacherOverviewColumns(teacher);
  const start = () => { setDraft(createTeacherOverviewDraft(teacher)); setEditing(true); };
  const cancel = () => { setDraft(null); setEditing(false); };
  const save = async () => {
    if (!draft || !teacher?.teacher_id && !teacher?.id) return;
    if (!draft.first_name.trim() || !draft.last_name.trim()) return showToast.error('First name and last name are required.');
    setSaving(true);
    try {
      await teacherAPI.update(Number(teacher.teacher_id || teacher.id), buildTeacherOverviewUpdate(draft));
      onRefresh(); cancel(); showToast.success('Teacher information updated successfully.');
    } catch (error) { showToast.error(getErrorMessage(error) || 'Failed to update teacher information.'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-3">
    <div className="flex justify-end gap-2">{editing ? <><Button size="sm" variant="outline" onClick={cancel} disabled={saving}><X className="mr-1 h-4 w-4" />Cancel</Button><Button size="sm" onClick={save} disabled={saving} className="bg-emerald-600 text-white hover:bg-emerald-700">{saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}Save changes</Button></> : <Button size="sm" onClick={start} className="bg-indigo-600 text-white hover:bg-indigo-700"><PencilLine className="mr-1 h-4 w-4" />Edit information</Button>}</div>
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">{[{ title: 'Main information', rows: columns.main }, { title: 'Contact & professional information', rows: columns.professional }].map((section) => <section key={section.title} className="overflow-hidden rounded-md border dark:border-border"><h2 className="border-b bg-slate-50 px-3 py-2 text-sm font-bold dark:bg-muted/40">{section.title}</h2><dl data-alternating-list="true" className="divide-y text-sm dark:divide-border">{section.rows.map((item, index) => { const field = TEACHER_OVERVIEW_FIELDS[item.label]; return <div key={item.label} data-list-row="true" className="grid min-h-9 grid-cols-[125px_minmax(0,1fr)] items-center gap-3 px-3 py-2 sm:grid-cols-[165px_minmax(0,1fr)]" style={{ backgroundColor: getListRowBackground(index) }}><dt className="font-medium text-muted-foreground">{item.label}</dt><dd className="min-w-0 font-semibold">{editing && draft && field ? <Input aria-label={item.label} type={field === 'date_of_birth' ? 'date' : field === 'salary_percentage' ? 'number' : 'text'} min={field === 'salary_percentage' ? 0 : undefined} max={field === 'salary_percentage' ? 100 : undefined} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} className="h-8 bg-white text-xs dark:bg-slate-900" /> : item.value}</dd></div>; })}</dl></section>)}</div>
  </div>;
}
