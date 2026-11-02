import { useState } from 'react';
import { Text } from 'react-native';
import { useProgress } from '../api/queries';
import type { ProgressPeriod } from '../api/types';
import { LineChart } from '../components/LineChart';
import { Card, Chips, QueryView, SectionHeader, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';

// @MOB-127 @MOB-128 Home charts: attendance rate, average score per group, and coin balance, by month
// (last 6) or by day (last 30). Used by the student home and, per child, the parent home.
export function HomeCharts({ childId }: { childId?: number | null }) {
  const { t } = useT();
  const [period, setPeriod] = useState<ProgressPeriod>('month');
  const query = useProgress(childId, period);
  const byDay = period === 'day';
  const label = (key: string) => {
    const month = t.monthsShort[Number(key.slice(5, 7)) - 1] || key;
    return byDay ? `${Number(key.slice(8, 10))} ${month}` : month;
  };
  const percent = (v: number) => `${v}%`;

  return (
    <>
      <SectionHeader title={t.charts} />
      <Chips<ProgressPeriod>
        options={[
          { value: 'month', label: t.byMonth },
          { value: 'day', label: t.byDay },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <QueryView query={query}>
        {(data) => {
          const hasAttendance = data.attendance.some((a) => a.rate != null);
          const hasScores = data.scores.some((s) => s.points.some((p) => p.average != null));
          const lastCoins = data.coins[data.coins.length - 1];
          return (
            <>
              <SectionHeader title={t.attendanceTrend} />
              <Card>
                {hasAttendance ? (
                  <LineChart
                    keys={data.keys}
                    series={[{ label: t.attendance, values: data.attendance.map((a) => a.rate) }]}
                    max={100}
                    format={percent}
                    label={label}
                    connectGaps={byDay}
                  />
                ) : (
                  <Text style={text.muted}>{t.noChartData}</Text>
                )}
              </Card>

              <SectionHeader title={t.scoresTrend} />
              <Card>
                {hasScores ? (
                  <LineChart
                    keys={data.keys}
                    series={data.scores.map((s) => ({ label: s.group, values: s.points.map((p) => p.average) }))}
                    max={100}
                    format={percent}
                    label={label}
                    connectGaps={byDay}
                  />
                ) : (
                  <Text style={text.muted}>{t.noChartData}</Text>
                )}
              </Card>

              <SectionHeader title={t.coinsTrend} />
              <Card>
                <LineChart
                  keys={data.keys}
                  series={[{ label: t.coins, values: data.coins.map((c) => c.balance) }]}
                  format={(v) => v.toLocaleString('en-US')}
                  label={label}
                />
                {lastCoins ? (
                  <Text style={[text.muted, { marginTop: 4 }]}>
                    {byDay ? t.today : label(lastCoins.key)}: +{lastCoins.earned} {t.earned}
                  </Text>
                ) : null}
              </Card>
              <Text style={[text.muted, { textAlign: 'center' }]}>{byDay ? t.chartTapHintDay : t.chartTapHint}</Text>
            </>
          );
        }}
      </QueryView>
    </>
  );
}
