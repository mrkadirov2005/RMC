// Archive → Graduates: students who left having reached their result, with what the city
// administration asks for later (passport, birth date, school, how long and what they studied)
// and their certificate PDFs.
import { Fragment, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Download, FilePlus2, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { archiveAPI } from './api';

type Certificate = { certificate_id: number; title: string; file_name: string; file_size: number };
type Graduate = {
  student_id: number; first_name: string; last_name: string; father_name?: string | null; passport_number?: string | null;
  date_of_birth?: string | null; phone?: string | null; parent_phone?: string | null; school_name?: string | null; school_class?: string | null;
  result?: string | null; studied_from?: string | null; finished_on?: string | null; months_studied?: number | null;
  groups?: string | null; teachers?: string | null; subjects?: string | null; certificates: Certificate[];
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
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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
    if (!title.trim() || !file) {
      showToast.error('Enter the certificate name and choose a PDF file.');
      return;
    }
    if (file.type !== 'application/pdf' || file.size > MAX_PDF_BYTES) {
      showToast.error('Only a PDF file up to 5 MB can be uploaded.');
      return;
    }
    setSaving(true);
    try {
      await archiveAPI.uploadCertificate(studentId, { title: title.trim(), file_name: file.name, data: await readAsDataUrl(file) });
      showToast.success('Certificate saved');
      setUploadFor(null);
      setTitle('');
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
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = certificate.file_name;
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
        {rows.map((row) => (
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
                  {row.certificates.map((certificate) => (
                    <span key={certificate.certificate_id} className="inline-flex items-center gap-1">
                      <button type="button" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline" onClick={() => download(certificate)}>
                        <Download className="h-3.5 w-3.5" /> {certificate.title}
                      </button>
                      <button type="button" className="text-destructive" aria-label={t('Delete the certificate "{title}"?', { title: certificate.title })} onClick={() => remove(certificate)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setUploadFor(uploadFor === row.student_id ? null : row.student_id); setTitle(''); setFile(null); }}>
                    <FilePlus2 className="mr-1 h-3.5 w-3.5" /> {t('Add certificate')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            {uploadFor === row.student_id && (
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={7}>
                  <form onSubmit={(event) => upload(event, row.student_id)} className="flex flex-wrap items-center gap-2">
                    <Input aria-label={t('Certificate name')} placeholder={t('e.g. IELTS 6.5')} value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} className="h-8 w-56" />
                    <Input aria-label={t('PDF file')} type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="h-8 w-72" />
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
  );
}
