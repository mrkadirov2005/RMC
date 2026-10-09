// "Doimiy nazorat": students the director follows personally. Each row shows the student's
// contacts, school, group and this month's study rating, and whom to keep informed.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { studentsApi } from '../api/studentsApi';
import { useStudentSearch, type StudentHit } from '../hooks/useStudentSearch';

type WatchRow = {
  watch_id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  father_name?: string | null;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  school_name?: string | null;
  school_class?: string | null;
  class_name?: string | null;
  teacher_name?: string | null;
  contact_name: string;
  contact_phone?: string | null;
  note?: string | null;
  rating: { group_place: number | null; group_size: number; center_place: number | null; average_score: number | null };
};

const EMPTY_FORM = { contact_name: '', contact_phone: '', note: '' };

export function WatchlistTab({ active }: { active: boolean }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<WatchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<StudentHit | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(getApiPayload<WatchRow[]>(await studentsApi.watchlist.getAll()) || []);
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not load the list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (active) void load(); }, [active, load]);

  const { hits, clear: clearHits } = useStudentSearch(query, !picked);

  const reset = () => { setEditingId(null); setPicked(null); setQuery(''); setForm(EMPTY_FORM); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.contact_name.trim() || (!editingId && !picked)) {
      showToast.error('Choose a student and enter whom to inform.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) await studentsApi.watchlist.update(editingId, form);
      else await studentsApi.watchlist.add({ student_id: Number(picked?.student_id), ...form });
      showToast.success(editingId ? 'Saved' : 'Student added to close watch');
      reset();
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const edit = (row: WatchRow) => {
    setEditingId(row.watch_id);
    setPicked({ student_id: row.student_id, first_name: row.first_name, last_name: row.last_name });
    setForm({ contact_name: row.contact_name, contact_phone: row.contact_phone || '', note: row.note || '' });
  };

  const remove = async (row: WatchRow) => {
    if (!window.confirm(t('Remove {name} from close watch?', { name: `${row.last_name} ${row.first_name}` }))) return;
    try {
      await studentsApi.watchlist.remove(row.watch_id);
      showToast.success('Removed from close watch');
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not remove');
    }
  };

  const ratingText = (rating: WatchRow['rating']) => {
    if (rating.average_score === null) return t('No scores this month');
    const parts = [rating.group_place ? t('Group: {place}/{size}', { place: rating.group_place, size: rating.group_size }) : '', rating.center_place ? t('Center: {place}', { place: rating.center_place }) : ''];
    return [...parts.filter(Boolean), t('Average: {score}', { score: rating.average_score })].join(' · ');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1.2fr_auto] xl:items-end">
        <div className="relative space-y-1">
          <Label htmlFor="watch-student">{t('Student')}</Label>
          {picked ? (
            <div className="flex h-10 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm font-semibold">
              <span className="truncate">{picked.last_name} {picked.first_name}</span>
              {!editingId && <button type="button" aria-label={t('Clear')} onClick={() => { setPicked(null); setQuery(''); }}><X className="h-4 w-4" /></button>}
            </div>
          ) : (
            <Input id="watch-student" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search by name')} autoComplete="off" />
          )}
          {!picked && hits.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-lg">
              {hits.map((hit) => (
                <li key={hit.student_id}>
                  <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setPicked(hit); clearHits(); }}>
                    {hit.last_name} {hit.first_name}{hit.class_name ? <span className="text-muted-foreground"> · {hit.class_name}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="watch-contact">{t('Whom to inform')}</Label>
          <Input id="watch-contact" required maxLength={255} value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} placeholder={t('e.g. the father, Vali Karimov')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="watch-phone">{t('Their phone')}</Label>
          <Input id="watch-phone" maxLength={50} inputMode="tel" value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="watch-note">{t('Note')}</Label>
          <Input id="watch-note" maxLength={1000} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : editingId ? <Pencil className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
            {editingId ? t('Save') : t('Add')}
          </Button>
          {editingId && <Button type="button" variant="ghost" onClick={reset}>{t('Cancel')}</Button>}
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t('No students under close watch yet.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Student')}</TableHead>
                <TableHead>{t('Phone')}</TableHead>
                <TableHead>{t('Parent')}</TableHead>
                <TableHead>{t('School and class')}</TableHead>
                <TableHead>{t('Group')}</TableHead>
                <TableHead>{t('Study rating')}</TableHead>
                <TableHead>{t('Whom to inform')}</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.watch_id}>
                  <TableCell>
                    <div className="font-semibold">{row.last_name} {row.first_name}</div>
                    {row.father_name && <div className="text-xs text-muted-foreground">{row.father_name}</div>}
                    {row.note && <div className="mt-1 text-xs italic text-muted-foreground">{row.note}</div>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.phone || '—'}</TableCell>
                  <TableCell>
                    <div>{row.parent_name || '—'}</div>
                    {row.parent_phone && <div className="whitespace-nowrap text-xs text-muted-foreground">{row.parent_phone}</div>}
                  </TableCell>
                  <TableCell>{[row.school_name, row.school_class].filter(Boolean).join(', ') || '—'}</TableCell>
                  <TableCell>
                    <div>{row.class_name || '—'}</div>
                    {row.teacher_name && <div className="text-xs text-muted-foreground">{row.teacher_name}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{ratingText(row.rating)}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{row.contact_name}</div>
                    {row.contact_phone && <div className="whitespace-nowrap text-xs text-muted-foreground">{row.contact_phone}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label={t('Open student')}><Link to={`/students/${row.student_id}/profile`}><Eye className="h-4 w-4" /></Link></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('Edit')} onClick={() => edit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={t('Remove from close watch')} onClick={() => remove(row)}><Trash2 className="h-4 w-4" /></Button>
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
