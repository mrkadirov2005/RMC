// Siblings, relatives and friends who come together, shown inside "Multiple groups". Parents
// usually ask about them together, so each group lists everyone with their group and phones.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { studentsApi } from '../api/studentsApi';
import { useStudentSearch, type StudentHit } from '../hooks/useStudentSearch';

type Member = { student_id: number; first_name: string; last_name: string; class_name?: string | null; teacher_name?: string | null; phone?: string | null; parent_phone?: string | null; is_deleted?: boolean };
type LinkGroup = { link_id: number; relation_type: string; note?: string | null; members: Member[] };

const RELATION_LABELS: Record<string, string> = { siblings: 'Siblings', relatives: 'Relatives', friends: 'Friends' };

export function StudentLinksPanel({ active }: { active: boolean }) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [relation, setRelation] = useState('siblings');
  const [note, setNote] = useState('');
  const [members, setMembers] = useState<StudentHit[]>([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const { hits, clear } = useStudentSearch(query);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(getApiPayload<LinkGroup[]>(await studentsApi.links.getAll()) || []);
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not load the list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (active) void load(); }, [active, load]);

  const reset = () => { setEditingId(null); setRelation('siblings'); setNote(''); setMembers([]); setQuery(''); };
  const addMember = (hit: StudentHit) => {
    setMembers((current) => (current.some((member) => member.student_id === hit.student_id) ? current : [...current, hit]));
    setQuery('');
    clear();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (members.length < 2) {
      showToast.error('Choose at least two students.');
      return;
    }
    setSaving(true);
    const data = { relation_type: relation, student_ids: members.map((member) => member.student_id), note };
    try {
      if (editingId) await studentsApi.links.update(editingId, data);
      else await studentsApi.links.create(data);
      showToast.success('Saved');
      reset();
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const edit = (group: LinkGroup) => {
    setEditingId(group.link_id);
    setRelation(group.relation_type);
    setNote(group.note || '');
    setMembers(group.members.map(({ student_id, first_name, last_name, class_name }) => ({ student_id, first_name, last_name, class_name })));
  };

  const remove = async (group: LinkGroup) => {
    if (!window.confirm(t('Delete this group of linked students?'))) return;
    try {
      await studentsApi.links.remove(group.link_id);
      showToast.success('Deleted');
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not delete');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-3">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr]">
          <div className="space-y-1">
            <Label htmlFor="link-relation">{t('Relation')}</Label>
            <Select value={relation} onValueChange={setRelation}>
              <SelectTrigger id="link-relation"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RELATION_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{t(label)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="relative space-y-1">
            <Label htmlFor="link-search">{t('Add a student')}</Label>
            <Input id="link-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search by name')} autoComplete="off" />
            {hits.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                {hits.map((hit) => (
                  <li key={hit.student_id}>
                    <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => addMember(hit)}>
                      {hit.last_name} {hit.first_name}{hit.class_name ? <span className="text-muted-foreground"> · {hit.class_name}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="link-note">{t('Note')}</Label>
            <Input id="link-note" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('e.g. parents always ask about both')} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {members.map((member) => (
            <span key={member.student_id} className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-sm">
              {member.last_name} {member.first_name}
              <button type="button" aria-label={t('Remove {name}', { name: `${member.last_name} ${member.first_name}` })} onClick={() => setMembers((current) => current.filter((item) => item.student_id !== member.student_id))}><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
          {members.length === 0 && <span className="text-sm text-muted-foreground">{t('Search and add two or more students.')}</span>}
          <div className="ml-auto flex gap-2">
            {editingId && <Button type="button" variant="ghost" onClick={reset}>{t('Cancel')}</Button>}
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : editingId ? <Pencil className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
              {editingId ? t('Save') : t('Link students')}
            </Button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('No linked students yet.')}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <section key={group.link_id} className="rounded-lg border bg-card" data-testid="student-link-group">
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <div>
                  <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">{t(RELATION_LABELS[group.relation_type] || group.relation_type)}</span>
                  {group.note && <span className="ml-2 text-xs text-muted-foreground">{group.note}</span>}
                </div>
                <div className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('Edit')} onClick={() => edit(group)}><Pencil className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={t('Delete')} onClick={() => remove(group)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <ul className="divide-y text-sm">
                {group.members.map((member) => (
                  <li key={member.student_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span>
                      <span className="font-semibold">{member.last_name} {member.first_name}</span>
                      {member.is_deleted && <span className="ml-1 text-xs text-rose-600">({t('left')})</span>}
                      <span className="block text-xs text-muted-foreground">{[member.class_name, member.teacher_name].filter(Boolean).join(' · ') || t('No group')}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{member.parent_phone || member.phone || ''}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
