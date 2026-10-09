// "Darslar nazorati": scoring discipline per teacher, teachers' requests to move a lesson, and days
// off. KPI points come from the server for the owner only.
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiPayload } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { lessonControlAPI } from './api';
import { currentMonth, type Summary } from './lessonControlFormat';
import { DaysOffPanel } from './components/DaysOffPanel';
import { RescheduleRequests } from './components/RescheduleRequests';

type TeacherRow = { teacher_id: number; teacher_name?: string | null; summary: Summary };

const LessonControlPage = () => {
  const { t } = useLanguage();
  const [month, setMonth] = useState(currentMonth);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    lessonControlAPI.discipline({ month })
      .then((response) => setTeachers(getApiPayload<{ teachers: TeacherRow[] }>(response)?.teachers || []))
      .catch((err) => setError(getErrorMessage(err) || 'Could not load the list'));
  }, [month]);

  const showPoints = teachers.some((teacher) => teacher.summary.points != null);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t('Lesson control')}</h1>
          <p className="text-sm text-muted-foreground">{t('Scores are due within two hours of the lesson start.')}</p>
        </div>
        <Input type="month" aria-label={t('Month')} value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} className="w-44" />
      </div>
      <Tabs defaultValue="discipline">
        <TabsList>
          <TabsTrigger value="discipline">{t('Scoring on time')}</TabsTrigger>
          <TabsTrigger value="requests">{t('Requests to move a lesson')}</TabsTrigger>
          <TabsTrigger value="days-off">{t('Days off')}</TabsTrigger>
        </TabsList>
        <TabsContent value="discipline" className="pt-3">
          {error ? <p className="text-sm text-destructive">{t(error)}</p> : teachers.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{t('No lessons to check yet this month.')}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Teacher')}</TableHead>
                    <TableHead className="text-right">{t('Lessons due')}</TableHead>
                    <TableHead className="text-right">{t('On time')}</TableHead>
                    <TableHead className="text-right">{t('Late')}</TableHead>
                    <TableHead className="text-right">{t('Not scored')}</TableHead>
                    {showPoints && <TableHead className="text-right">KPI</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.teacher_id} data-testid="discipline-row">
                      <TableCell className="font-semibold">{teacher.teacher_name || '—'}</TableCell>
                      <TableCell className="text-right">{teacher.summary.due}</TableCell>
                      <TableCell className="text-right text-emerald-600">{teacher.summary.on_time}</TableCell>
                      <TableCell className="text-right text-amber-600">{teacher.summary.late}</TableCell>
                      <TableCell className="text-right text-rose-600">{teacher.summary.missing}</TableCell>
                      {showPoints && <TableCell className={`text-right font-black ${Number(teacher.summary.points) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{Number(teacher.summary.points) > 0 ? '+' : ''}{teacher.summary.points}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="requests" className="pt-3"><RescheduleRequests /></TabsContent>
        <TabsContent value="days-off" className="pt-3"><DaysOffPanel month={month} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default LessonControlPage;
