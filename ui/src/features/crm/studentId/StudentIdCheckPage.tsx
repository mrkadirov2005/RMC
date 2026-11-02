// @MOB-125 Admins and teachers check a student's ID QR. A USB or phone scanner types the code into
// the field and presses Enter; the code can also be pasted.
import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/i18n/LanguageContext';
import { getApiPayload } from '@/shared/api/response';
import { studentIdAPI, type StudentIdCheck } from './api';

const StudentIdCheckPage = () => {
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<StudentIdCheck | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const reasons: Record<string, string> = {
    malformed: t('This is not a student ID code.'),
    bad_signature: t('The code was changed or forged.'),
    expired: t('The code has expired. Ask the student to open the ID again (a screenshot does not work).'),
    not_found: t('Student not found.'),
    other_center: t('The student belongs to another branch.'),
    inactive: t('The student is not active.'),
  };

  const check = async (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    try {
      setResult(getApiPayload<StudentIdCheck>(await studentIdAPI.verify(token.trim())));
    } catch {
      // API interceptor shows the backend message.
      setResult(null);
    } finally {
      setBusy(false);
      setToken('');
      input.current?.focus();
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-4">
      <div>
        <h1 className="text-2xl font-bold">{t('Student ID check')}</h1>
        <p className="text-sm text-muted-foreground">{t('Scan the QR code in the student app, or paste its text.')}</p>
      </div>
      <form onSubmit={check} className="flex gap-2">
        <Input ref={input} autoFocus value={token} onChange={(e) => setToken(e.target.value)} placeholder="v1.…" aria-label={t('ID code')} />
        <Button type="submit" disabled={busy || !token.trim()}>
          {t('Check ID')}
        </Button>
      </form>
      {result && (
        <Card className={result.valid ? 'border-emerald-300' : 'border-rose-300'}>
          <CardContent className="flex items-start gap-3 pt-5">
            {result.valid ? <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" /> : <XCircle className="h-8 w-8 shrink-0 text-rose-600" />}
            <div className="grid gap-1">
              <p className="text-lg font-semibold">{result.valid ? t('Valid ID') : t('Not valid')}</p>
              {result.reason && <p className="text-sm text-muted-foreground">{reasons[result.reason] ?? result.reason}</p>}
              {result.student && (
                <>
                  <p className="font-semibold">
                    {result.student.first_name} {result.student.last_name} <span className="text-xs text-muted-foreground">#{result.student.student_id}</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.student.groups.map((g) => (
                      <Badge key={g} variant="secondary">
                        {g}
                      </Badge>
                    ))}
                    {result.student.is_frozen && <Badge variant="warning">{t('Frozen')}</Badge>}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentIdCheckPage;
