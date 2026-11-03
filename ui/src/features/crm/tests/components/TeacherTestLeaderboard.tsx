// Which teachers' students do best. The backend ranks on pass rate against each
// test's own pass mark, and only ranks a teacher once enough of their work has
// actually been graded — ranking on average score alone would crown whoever set
// one easy test. The floor is published in the response rather than hard-coded
// here, so the table and the rule can never drift apart.

import { Trophy } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TeacherTestStats } from '../api/testStatisticsApi';

const formatPercent = (value: number | null) => (value == null ? '—' : `${value}%`);

interface TeacherTestLeaderboardProps {
  teachers: TeacherTestStats[];
  centerMedian: { average_score: number | null; pass_rate: number | null; ranked_teachers: number };
  minimumGradedSubmissions: number;
  scope: 'center' | 'self';
}

export const TeacherTestLeaderboard = ({
  teachers,
  centerMedian,
  minimumGradedSubmissions,
  scope,
}: TeacherTestLeaderboardProps) => {
  const { t } = useLanguage();
  if (teachers.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t('No teacher has created a test yet.')}
      </p>
    );
  }

  const bestId = teachers.find((teacher) => teacher.ranked)?.teacher_id ?? null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-0 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('Teacher')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('Tests')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('Submissions')}
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('Avg score')}
              </th>
              <th className="px-0 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('Pass rate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr
                key={teacher.teacher_id}
                className={`border-b last:border-b-0 ${teacher.teacher_id === bestId ? 'bg-primary/5' : ''}`}
              >
                <td className="px-0 py-2.5 text-foreground">
                  <span className={teacher.teacher_id === bestId ? 'font-semibold' : ''}>{teacher.teacher_name}</span>
                  {teacher.teacher_id === bestId && (
                    <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-medium text-primary">
                      <Trophy className="h-3 w-3" aria-hidden="true" />
                      {t('Best')}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{teacher.tests}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{teacher.submissions}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {teacher.average_score == null ? '—' : `${teacher.average_score}%`}
                </td>
                <td className="px-0 py-2.5 text-right tabular-nums text-muted-foreground">
                  {teacher.ranked ? formatPercent(teacher.pass_rate) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {t('Ranked by pass rate once a teacher has {count} graded submissions; a dash means not enough yet.', { count: minimumGradedSubmissions })}
        {centerMedian.ranked_teachers > 0 &&
          ` ${t('Center median: {rate} pass rate.', { rate: formatPercent(centerMedian.pass_rate) })}`}
        {scope === 'self' && ` ${t('You see your own row; colleagues appear only in the center median.')}`}
      </p>
    </div>
  );
};

export default TeacherTestLeaderboard;
