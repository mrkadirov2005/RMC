import { Text } from 'react-native';
import { useProgress } from '../api/queries';
import { LineChart } from '../components/LineChart';
import { Card, QueryView, SectionHeader, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';

// @MOB-127 Home charts for the last six months: attendance rate, average score per group, and
// the coin balance at the end of each month. Used by the student home and, per child, the parent home.
export function HomeCharts({ childId }: { childId?: number | null }) {
  const { t } = useT();
  const query = useProgress(childId);
  const monthLabel = (month: string) => t.monthsShort[Number(month.slice(5, 7)) - 1] || month;
  const percent = (v: number) => `${v}%`;

  return (
    <QueryView query={query}>
      {(data) => {
        const hasAttendance = data.attendance.some((a) => a.rate != null);
        const hasScores = data.scores.some((s) => s.points.some((p) => p.average != null));
        return (
          <>
            <SectionHeader title={t.attendanceTrend} />
            <Card>
              {hasAttendance ? (
                <LineChart
                  months={data.months}
                  series={[{ label: t.attendance, values: data.attendance.map((a) => a.rate) }]}
                  max={100}
                  format={percent}
                  monthLabel={monthLabel}
                />
              ) : (
                <Text style={text.muted}>{t.noChartData}</Text>
              )}
            </Card>

            <SectionHeader title={t.scoresTrend} />
            <Card>
              {hasScores ? (
                <LineChart
                  months={data.months}
                  series={data.scores.map((s) => ({ label: s.group, values: s.points.map((p) => p.average) }))}
                  max={100}
                  format={percent}
                  monthLabel={monthLabel}
                />
              ) : (
                <Text style={text.muted}>{t.noChartData}</Text>
              )}
            </Card>

            <SectionHeader title={t.coinsTrend} />
            <Card>
              <LineChart
                months={data.months}
                series={[{ label: t.coins, values: data.coins.map((c) => c.balance) }]}
                format={(v) => v.toLocaleString('en-US')}
                monthLabel={monthLabel}
              />
              <Text style={[text.muted, { marginTop: 4 }]}>
                {monthLabel(data.months[data.months.length - 1])}: +{data.coins[data.coins.length - 1]?.earned ?? 0} {t.earned}
              </Text>
            </Card>
            <Text style={[text.muted, { textAlign: 'center' }]}>{t.chartTapHint}</Text>
          </>
        );
      }}
    </QueryView>
  );
}
