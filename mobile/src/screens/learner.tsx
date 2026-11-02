import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAnnouncements, useAttendance, useCoins, useGrades, useNotifications, usePayments, usePolicies, useSchedule } from '../api/queries';
import type { Dashboard, GradeRow, MonthlyAverage, ScheduleSlot } from '../api/types';
import { Bar, Card, Empty, ListRow, Pill, QueryView, Ring, SectionHeader, Tag, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { attendanceTone, hhmm, money, nextLesson, shortDate, WEEK_ORDER } from '../lib/format';
import { colors, space } from '../theme/tokens';

// Sections shared by the student's own screens and a parent's view of a child. `childId` is
// set only for parents; detail screens get it through the ?child= route param.
const detailHref = (path: string, childId?: number | null) => (childId ? `${path}?child=${childId}` : path);

// @MOB-120 @MOB-130 Next lesson from the weekly timetable.
export function NextLessonCard({ slots }: { slots: ScheduleSlot[] }) {
  const { t } = useT();
  const next = nextLesson(slots);
  if (!next) {
    return (
      <Card>
        <Text style={text.muted}>{t.noLessonsSoon}</Text>
      </Card>
    );
  }
  const { slot, daysAhead } = next;
  return (
    <Card tone="blue">
      <Text style={[text.white, { opacity: 0.8, fontSize: 12.5 }]}>
        {t.nextLesson} · {daysAhead === 0 ? t.today : t.days[slot.day] || slot.day}
      </Text>
      <Text style={[text.white, styles.lessonTitle]}>
        {slot.class_name || '—'} · {hhmm(slot.start_time)}
      </Text>
      <Text style={[text.white, { opacity: 0.9 }]}>
        {[slot.room ? `${slot.room}` : null, slot.teacher_name].filter(Boolean).join(' · ')}
      </Text>
    </Card>
  );
}

// @MOB-120 @MOB-130 Attendance ring and coin balance side by side.
export function StatsRow({ data, childId }: { data: Dashboard; childId?: number | null }) {
  const { t } = useT();
  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <Card style={styles.half} onPress={() => router.push(detailHref('/attendance', childId) as never)}>
          <Ring value={data.attendance.rate} label={t.attendanceRate} />
        </Card>
      </View>
      <View style={styles.cell}>
        <Card style={styles.half} onPress={() => router.push(detailHref('/coins', childId) as never)}>
          <Text style={text.muted}>{t.coins}</Text>
          <Text style={[text.big, { marginTop: 6 }]}>🪙 {data.coins.balance.toLocaleString('en-US')}</Text>
        </Card>
      </View>
    </View>
  );
}

export function GradeItem({ row }: { row: GradeRow }) {
  const score = row.percentage != null ? `${Math.round(row.percentage)}%` : row.marks_obtained != null ? `${row.marks_obtained}/${row.total_marks ?? '?'}` : '—';
  const tone = row.percentage == null ? 'blue' : row.percentage >= 80 ? 'ok' : row.percentage >= 60 ? 'warn' : 'bad';
  return (
    <ListRow
      icon="📘"
      title={row.class_name || row.subject || '—'}
      subtitle={[shortDate(row.date), row.teacher_name, row.coins ? `+${row.coins} 🪙` : null].filter(Boolean).join(' · ')}
      right={<Tag label={score} tone={tone} />}
    />
  );
}

export function RecentResults({ rows, childId }: { rows: GradeRow[]; childId?: number | null }) {
  const { t } = useT();
  return (
    <>
      <SectionHeader title={t.recentResults} action={t.seeAll} onAction={() => router.push(detailHref('/results', childId) as never)} />
      {rows.length ? rows.slice(0, 3).map((row) => <GradeItem key={row.grade_id} row={row} />) : <Empty />}
    </>
  );
}

// @MOB-121 Weekly timetable grouped by weekday.
export function ScheduleSection({ childId }: { childId?: number | null }) {
  const { t } = useT();
  const query = useSchedule(childId);
  return (
    <QueryView query={query}>
      {(data) => {
        if (!data.items.length) return <Empty />;
        return (
          <>
            {WEEK_ORDER.filter((day) => data.items.some((s) => s.day === day)).map((day) => (
              <Card key={day}>
                <Text style={[text.bold, { marginBottom: 6 }]}>{t.days[day] || day}</Text>
                {data.items
                  .filter((s) => s.day === day)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((s, i) => (
                    <View key={`${s.class_id}-${i}`} style={styles.slot}>
                      <Text style={[text.bold, { width: 96 }]}>
                        {hhmm(s.start_time)}
                        {s.end_time ? `–${hhmm(s.end_time)}` : ''}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text }}>{s.class_name}</Text>
                        <Text style={text.muted}>{[s.room, s.teacher_name].filter(Boolean).join(' · ')}</Text>
                      </View>
                    </View>
                  ))}
              </Card>
            ))}
          </>
        );
      }}
    </QueryView>
  );
}

// @MOB-122 @MOB-132 Monthly averages per group: each group gets its own bars, never mixed.
export function MonthlyChart({ monthly }: { monthly: MonthlyAverage[] }) {
  const { t } = useT();
  const groups = Array.from(new Set(monthly.map((m) => m.class_name || '—')));
  if (!monthly.length) return null;
  return (
    <>
      <SectionHeader title={t.monthlyAverage} />
      {groups.map((group) => {
        const rows = monthly.filter((m) => (m.class_name || '—') === group).slice(-6);
        return (
          <Card key={group}>
            <Text style={[text.bold, { marginBottom: space.md }]}>{group}</Text>
            <View style={styles.bars}>
              {rows.map((m) => (
                <View key={m.month} style={styles.barCol}>
                  <Text style={styles.barValue}>{m.average}</Text>
                  <View style={[styles.barFill, { height: Math.max(4, m.average) }]} />
                  <Text style={text.muted}>{m.month.slice(5)}</Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}
    </>
  );
}

// @MOB-122 Results screen body.
export function ResultsSection({ childId }: { childId?: number | null }) {
  const { t } = useT();
  const query = useGrades(childId);
  return (
    <QueryView query={query}>
      {(data) => (
        <>
          <MonthlyChart monthly={data.monthly} />
          <SectionHeader title={t.results} />
          {data.items.length ? data.items.map((row) => <GradeItem key={row.grade_id} row={row} />) : <Empty />}
        </>
      )}
    </QueryView>
  );
}

// @MOB-121 Attendance totals and history.
export function AttendanceSection({ childId }: { childId?: number | null }) {
  const { t } = useT();
  const query = useAttendance(childId);
  const labels: Record<string, string> = { Present: t.present, Late: t.late, Excused: t.excused };
  return (
    <QueryView query={query}>
      {(data) => (
        <>
          <Card>
            <View style={[styles.row, { alignItems: 'center' }]}>
              <Ring value={data.summary.rate} label={t.attendanceRate} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text }}>
                  {t.present}: <Text style={text.bold}>{data.summary.present}</Text>
                </Text>
                <Text style={{ color: colors.text }}>
                  {t.absent}: <Text style={text.bold}>{data.summary.absent}</Text>
                </Text>
                <Text style={{ color: colors.text }}>
                  {t.excused}: <Text style={text.bold}>{data.summary.excused}</Text>
                </Text>
              </View>
            </View>
          </Card>
          <SectionHeader title={t.history} />
          {data.items.length ? (
            data.items.map((row) => (
              <ListRow
                key={row.attendance_id}
                icon="📅"
                title={shortDate(row.attendance_date)}
                right={<Tag label={labels[row.status] || (row.status.startsWith('Absent') ? t.absent : row.status)} tone={attendanceTone(row.status)} />}
              />
            ))
          ) : (
            <Empty />
          )}
        </>
      )}
    </QueryView>
  );
}

// @MOB-123 Coin balance and history.
export function CoinsSection({ childId }: { childId?: number | null }) {
  const { t } = useT();
  const query = useCoins(childId);
  return (
    <QueryView query={query}>
      {(data) => (
        <>
          <Card tone="blue" style={{ alignItems: 'center' }}>
            <Text style={[text.white, { opacity: 0.8 }]}>{t.balance}</Text>
            <Text style={[text.white, { fontSize: 34, fontWeight: '800' }]}>🪙 {data.balance.toLocaleString('en-US')}</Text>
          </Card>
          <SectionHeader title={t.history} />
          {data.items.length ? (
            data.items.map((tx) => (
              <ListRow
                key={tx.transaction_id}
                title={tx.reason || tx.source_type || t.coins}
                subtitle={shortDate(tx.created_at)}
                right={<Text style={[text.bold, { color: tx.delta > 0 ? colors.success : tx.delta < 0 ? colors.danger : colors.muted }]}>{tx.delta > 0 ? `+${tx.delta}` : tx.delta}</Text>}
              />
            ))
          ) : (
            <Empty />
          )}
        </>
      )}
    </QueryView>
  );
}

// @MOB-133 Outstanding balance, due date and history. Read-only.
export function PaymentsSection({ childId }: { childId?: number | null }) {
  const { t } = useT();
  const query = usePayments(childId);
  return (
    <QueryView query={query}>
      {(data) => (
        <>
          <Card tone="blue">
            <Text style={[text.white, { opacity: 0.8 }]}>{t.outstanding}</Text>
            <Text style={[text.white, { fontSize: 30, fontWeight: '800' }]}>{money(data.outstanding, t.currency)}</Text>
            <Text style={[text.white, { opacity: 0.9 }]}>{data.outstanding > 0 && data.next_due_date ? `${t.dueDate}: ${shortDate(data.next_due_date)}` : t.noDebt}</Text>
          </Card>
          {data.open_debts.map((debt) => (
            <ListRow key={debt.debt_id} icon="⏳" title={money(debt.amount, t.currency)} subtitle={[shortDate(debt.due_date || debt.debt_date), debt.remarks].filter(Boolean).join(' · ')} right={<Tag label={t.outstanding} tone="warn" />} />
          ))}
          <SectionHeader title={t.paymentHistory} />
          {data.items.length ? (
            data.items.map((p) => (
              <ListRow key={p.payment_id} icon="💳" title={money(p.amount, t.currency)} subtitle={[shortDate(p.date), p.method].filter(Boolean).join(' · ')} />
            ))
          ) : (
            <Empty />
          )}
          <Text style={[text.muted, { marginTop: space.sm }]}>{t.paymentsReadOnly}</Text>
        </>
      )}
    </QueryView>
  );
}

// @MOB-151 @MOB-152 Home cards: rules waiting for acceptance, and the latest announcement.
export function SchoolNews() {
  const { t } = useT();
  const policies = usePolicies();
  const announcements = useAnnouncements();
  const latest = announcements.data?.items[0];
  return (
    <>
      {policies.data && policies.data.pending > 0 ? (
        <ListRow icon="📜" title={t.rulesPending} right={<Tag label={String(policies.data.pending)} tone="warn" />} onPress={() => router.push('/rules')} />
      ) : null}
      {latest ? (
        <Card onPress={() => router.push('/announcements')}>
          <Text style={text.muted}>📣 {t.announcements}</Text>
          <Text style={[text.bold, { marginTop: 4 }]}>{latest.title}</Text>
          <Text style={{ color: colors.text, marginTop: 2 }} numberOfLines={2}>
            {latest.body}
          </Text>
        </Card>
      ) : null}
    </>
  );
}

// @MOB-126 Bell with the unread count; opens the inbox.
export function NotificationBell() {
  const { data } = useNotifications();
  const unread = data?.unread ?? 0;
  return <Pill label={unread > 0 ? `🔔 ${unread}` : '🔔'} onPress={() => router.push('/notifications')} />;
}

export function ProgressBar({ value }: { value: number }) {
  return <Bar value={value} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  cell: { flex: 1 },
  half: { minHeight: 112, justifyContent: 'center', alignItems: 'center' },
  lessonTitle: { fontSize: 20, fontWeight: '700', marginVertical: 2 },
  slot: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: space.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, height: 130 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barFill: { width: '100%', backgroundColor: colors.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barValue: { fontSize: 11, fontWeight: '600', color: colors.text },
});
