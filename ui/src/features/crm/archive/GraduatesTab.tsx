// Archive → Graduates: students who left having reached their result, with what the city
// administration asks for later (passport, birth date, school, how long and what they studied)
// and their certificate PDFs.
import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Download, ExternalLink, FilePlus2, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { archiveAPI } from './api';
import { ArchiveFilterBar } from './ArchiveFilterBar';
import { applyFilters, buildOptions, emptyFilters, type ArchiveTabConfig } from './archiveFilters';

type RecordKind = 'certificate' | 'admission' | 'thanks';
type Certificate = {
  certificate_id: number; title: string; kind?: RecordKind; received_on?: string | null; link_url?: string | null; note?: string | null;
  has_file?: boolean; file_name: string | null; file_size: number | null;
};
const KIND_LABEL: Record<RecordKind, string> = { certificate: 'Certificate', admission: 'University admission', thanks: 'Thank-you note' };
const KIND_TONE: Record<RecordKind, string> = {
  certificate: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  admission: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  thanks: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};
const ACCEPTED_FILES = ['application/pdf', 'image/png', 'image/jpeg'];
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { kind: 'certificate' as RecordKind, title: '', received_on: '', link_url: '', note: '' };
type Graduate = {
  student_id: number; first_name: string; last_name: string; father_name?: string | null; passport_number?: string | null;
  date_of_birth?: string | null; phone?: string | null; parent_phone?: string | null; school_name?: string | null; school_class?: string | null;
  result?: string | null; studied_from?: string | null; finished_on?: string | null; months_studied?: number | null;
  groups?: string | null; teachers?: string | null; subjects?: string | null; certificates: Certificate[];
};

// Groups, teachers and subjects come as one comma-separated text per graduate; the first is
// enough to filter by (most graduates studied in one group).
const first = (value?: string | null) => String(value || '').split(',')[0].trim() || null;

const graduateFilters: ArchiveTabConfig<Graduate> = {
  searchText: (row) => [row.first_name, row.last_name, row.father_name, row.phone, row.parent_phone, row.passport_number, row.school_name, row.result, row.groups, row.teachers, row.subjects, ...row.certificates.map((certificate) => certificate.title)],
  selects: [
    { key: 'subject', label: 'Subject', value: (row) => first(row.subjects) },
    { key: 'teacher', label: 'Teacher', value: (row) => first(row.teachers) },
    { key: 'certificate', label: 'Certificates', value: (row) => (row.certificates.length > 0 ? 'yes' : 'no'), optionLabel: (row) => (row.certificates.length > 0 ? 'Has a certificate' : 'No certificate yet') },
  ],
  date: (row) => row.finished_on,
};

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const day = (value?: string | null) => (value ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}` : '—');
const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

export function GraduatesTab() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Graduate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFor, setUploadFor] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  // Received in a year, or one month of it (e.g. "2026" or "2026-09").
  const [receivedYear, setReceivedYear] = useState('');
  const [receivedMonth, setReceivedMonth] = useState('');
  const receivedIn = receivedYear ? (receivedMonth ? `${receivedYear}-${receivedMonth}` : receivedYear) : '';
  const yearOptions = useMemo(() => Array.from(new Set(rows.flatMap((row) => row.certificates.map((c) => String(c.received_on || '').slice(0, 4)).filter(Boolean)))).sort().reverse(), [rows]);
  const shownRows = useMemo(() => {
    const filtered = applyFilters(rows, graduateFilters, filters);
    return receivedIn ? filtered.filter((row) => row.certificates.some((c) => String(c.received_on || '').startsWith(receivedIn))) : filtered;
  }, [rows, filters, receivedIn]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(getApiPayload<Graduate[]>(await archiveAPI.getGraduates()) || []);
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not load the list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const upload = async (event: FormEvent, studentId: number) => {
    event.preventDefault();
    if (!form.title.trim() || (!file && !form.link_url.trim())) {
      showToast.error('Enter the name and choose a file or paste a link.');
      return;
    }
    if (file && (!ACCEPTED_FILES.includes(file.type) || file.size > MAX_PDF_BYTES)) {
      showToast.error('Only a PDF or an image (PNG, JPG) up to 5 MB can be uploaded.');
      return;
    }
    setSaving(true);
    try {
      await archiveAPI.uploadCertificate(studentId, {
        title: form.title.trim(),
        kind: form.kind,
        received_on: form.received_on || today(),
        link_url: form.link_url.trim() || undefined,
        note: form.note.trim() || undefined,
        ...(file ? { file_name: file.name, data: await readAsDataUrl(file) } : {}),
      });
      showToast.success('Saved');
      setUploadFor(null);
      setForm(EMPTY_FORM);
      setFile(null);
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const download = async (certificate: Certificate) => {
    try {
      const response = await archiveAPI.downloadCertificate(certificate.certificate_id);
      const url = URL.createObjectURL(response.data instanceof Blob ? response.data : new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = certificate.file_name || `${certificate.title}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not download');
    }
  };

  const remove = async (certificate: Certificate) => {
    if (!window.confirm(t('Delete the certificate "{title}"?', { title: certificate.title }))) return;
    try {
      await archiveAPI.deleteCertificate(certificate.certificate_id);
      showToast.success('Deleted');
      await load();
    } catch (error) {
      showToast.error(getErrorMessage(error) || 'Could not delete');
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (rows.length === 0) {
    return <p className="p-8 text-center text-sm text-muted-foreground">{t('No graduates yet. Students archived with the reason "finished successfully" appear here.')}</p>;
  }

  return (
    <>
    <ArchiveFilterBar
      filters={filters}
      onChange={setFilters}
      searchPlaceholder={t('Search by name, phone, passport, school, group or result...')}
      selects={graduateFilters.selects.map((select) => ({
        key: select.key,
        label: t(select.label),
        options: buildOptions(rows, select).map((option) => ({ ...option, label: t(option.label) })),
      }))}
      dateLabel={t('Finished between')}
      shown={shownRows.length}
      total={rows.length}
    />
    <div className="flex flex-wrap items-center gap-2 px-1 pb-2 text-sm">
      <span className="font-semibold text-muted-foreground">{t('Received in')}:</span>
      <select aria-label={t('Year')} className="h-8 rounded-md border bg-background px-2" value={receivedYear} onChange={(event) => { setReceivedYear(event.target.value); if (!event.target.value) setReceivedMonth(''); }}>
        <option value="">{t('Any year')}</option>
        {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      <select aria-label={t('Month')} className="h-8 rounded-md border bg-background px-2" value={receivedMonth} disabled={!receivedYear} onChange={(event) => setReceivedMonth(event.target.value)}>
        <option value="">{t('Any month')}</option>
        {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((month) => (
          <option key={month} value={month}>{new Date(2026, Number(month) - 1, 1).toLocaleString(undefined, { month: 'long' })}</option>
        ))}
      </select>
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('Student')}</TableHead>
          <TableHead>{t('Passport and birth date')}</TableHead>
          <TableHead>{t('School')}</TableHead>
          <TableHead>{t('Studied with us')}</TableHead>
          <TableHead>{t('Subjects and groups')}</TableHead>
          <TableHead>{t('Result')}</TableHead>
          <TableHead>{t('Certificates')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shownRows.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{t('No records match the filters.')}</TableCell>
          </TableRow>
        )}
        {shownRows.map((row) => (
          <Fragment key={row.student_id}>
            <TableRow>
              <TableCell>
                <div className="font-semibold">{row.last_name} {row.first_name}</div>
                {row.father_name && <div className="text-muted-foreground">{row.father_name}</div>}
                {(row.parent_phone || row.phone) && <div className="text-muted-foreground">{row.parent_phone || row.phone}</div>}
              </TableCell>
              <TableCell>
                <div>{row.passport_number || '—'}</div>
                <div className="text-muted-foreground">{day(row.date_of_birth)}</div>
              </TableCell>
              <TableCell>{[row.school_name, row.school_class].filter(Boolean).join(', ') || '—'}</TableCell>
              <TableCell>
                <div>{day(row.studied_from)} – {day(row.finished_on)}</div>
                {row.months_studied != null && <div className="text-muted-foreground">{t('{count} months', { count: row.months_studied })}</div>}
              </TableCell>
              <TableCell>
                <div>{row.subjects || '—'}</div>
                <div className="text-muted-foreground">{[row.groups, row.teachers].filter(Boolean).join(' · ')}</div>
              </TableCell>
              <TableCell className="font-semibold">{row.result || '—'}</TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  {row.certificates.map((certificate) => {
                    const kind = certificate.kind || 'certificate';
                    return (
                      <span key={certificate.certificate_id} className="inline-flex flex-wrap items-center gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${KIND_TONE[kind]}`}>{t(KIND_LABEL[kind])}</span>
                        <span className="font-semibold">{certificate.title}</span>
                        <span className="text-xs text-muted-foreground">{day(certificate.received_on)}</span>
                        {certificate.link_url && (
                          <a href={certificate.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline" aria-label={t('Open link')}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {certificate.has_file !== false && certificate.file_name && (
                          <button type="button" className="text-primary" aria-label={t('Download')} onClick={() => download(certificate)}>
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button type="button" className="text-destructive" aria-label={t('Delete the certificate "{title}"?', { title: certificate.title })} onClick={() => remove(certificate)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {certificate.note && <span className="w-full text-xs text-muted-foreground">{certificate.note}</span>}
                      </span>
                    );
                  })}
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setUploadFor(uploadFor === row.student_id ? null : row.student_id); setForm(EMPTY_FORM); setFile(null); }}>
                    <FilePlus2 className="mr-1 h-3.5 w-3.5" /> {t('Add a result')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            {uploadFor === row.student_id && (
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={7}>
                  <form onSubmit={(event) => upload(event, row.student_id)} className="flex flex-wrap items-center gap-2">
                    <select aria-label={t('Type')} className="h-8 rounded-md border bg-background px-2 text-sm" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as RecordKind })}>
                      {(Object.keys(KIND_LABEL) as RecordKind[]).map((kind) => <option key={kind} value={kind}>{t(KIND_LABEL[kind])}</option>)}
                    </select>
                    <Input aria-label={t('Certificate name')} placeholder={t(form.kind === 'admission' ? 'e.g. Westminster University' : form.kind === 'thanks' ? 'e.g. Thanks from the parents' : 'e.g. IELTS 6.5')} value={form.title} maxLength={255} onChange={(event) => setForm({ ...form, title: event.target.value })} className="h-8 w-56" />
                    <Input aria-label={t('Received on')} type="date" value={form.received_on || today()} onChange={(event) => setForm({ ...form, received_on: event.target.value })} className="h-8 w-40" />
                    <Input aria-label={t('Link')} placeholder="https://" value={form.link_url} onChange={(event) => setForm({ ...form, link_url: event.target.value })} className="h-8 w-64" />
                    <Input aria-label={t('File (PDF or screenshot)')} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} className="h-8 w-64" />
                    <Input aria-label={t('Note')} placeholder={t('Note')} value={form.note} maxLength={2000} onChange={(event) => setForm({ ...form, note: event.target.value })} className="h-8 w-56" />
                    <Button type="submit" size="sm" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Upload')}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setUploadFor(null)}>{t('Cancel')}</Button>
                  </form>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
    </>
  );
}
