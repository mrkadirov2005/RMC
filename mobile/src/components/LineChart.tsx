import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/tokens';

// @MOB-127 Series colors in fixed order (validated: CVD and contrast pass on white; the third
// is below 3:1 contrast, so lines are always direct-labeled or listed in the legend).
export const SERIES_COLORS = ['#205FB6', '#EB6834', '#1BAF7A'];

export type Series = { label: string; values: (number | null)[] };

type Props = {
  keys: string[];
  series: Series[];
  max?: number;
  format?: (value: number) => string;
  height?: number;
  label?: (key: string) => string;
  // Join points across empty buckets (days without a lesson are not missing data).
  connectGaps?: boolean;
};

const PAD = { top: 12, right: 12, bottom: 22, left: 34 };

const niceMax = (value: number) => {
  if (value <= 0) return 10;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
};

// @MOB-127 Small line chart: one y-axis, recessive grid, 2px lines, 8px markers, gaps where a
// month has no data. Tap a month to read every series' value for it.
export function LineChart({ keys: months, series, max, format = (v) => String(v), height = 170, label: monthLabel = (m) => m.slice(5), connectGaps = false }: Props) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const shown = series.slice(0, SERIES_COLORS.length);
  const values = shown.flatMap((s) => s.values).filter((v): v is number => v != null);
  const top = max ?? niceMax(Math.max(...values, 0));

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (months.length > 1 ? (plotW * i) / (months.length - 1) : plotW / 2);
  const y = (v: number) => PAD.top + plotH - (plotH * Math.max(0, Math.min(v, top))) / top;

  // Lines break at empty buckets instead of inventing values, unless connectGaps is set.
  const pathOf = (vals: (number | null)[]) => {
    let d = '';
    let open = false;
    vals.forEach((v, i) => {
      if (v == null) {
        if (!connectGaps) open = false;
        return;
      }
      d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      open = true;
    });
    return d;
  };

  const grid = [0, 0.5, 1].map((f) => Math.round(top * f));
  // Until a tap, read out the latest bucket that has any value (today often has no lesson).
  const lastWithData = months.reduce((found, _m, i) => (shown.some((s) => s.values[i] != null) ? i : found), months.length - 1);
  const selected = active ?? lastWithData;
  // Many points: markers only on the selected bucket, so the line stays solid; a series with one or
  // two points keeps its markers, since it has little or no line to show.
  const dense = months.length > 12;
  // About six axis labels however many points there are. The selected bucket's label is placed first;
  // every other label is kept only if its box (estimated from its length) overlaps none already kept.
  const labelStep = Math.max(1, Math.ceil(months.length / 6));
  const lastIndex = months.length - 1;
  const anchorOf = (i: number) => (i === 0 ? 'start' : i === lastIndex ? 'end' : 'middle');
  const spanOf = (i: number) => {
    const w = monthLabel(months[i] || '').length * 6 + 6;
    const left = anchorOf(i) === 'start' ? x(i) : anchorOf(i) === 'end' ? x(i) - w : x(i) - w / 2;
    return [left, left + w] as const;
  };
  const candidates = [selected, ...months.map((_m, i) => i).filter((i) => i !== selected && (i % labelStep === 0 || i === lastIndex))];
  const kept: (readonly [number, number])[] = [];
  const visible = new Set<number>();
  candidates.forEach((i) => {
    const [a, b] = spanOf(i);
    if (kept.some(([c, d]) => a < d && c < b)) return;
    kept.push([a, b]);
    visible.add(i);
  });
  const showLabel = (i: number) => visible.has(i);

  return (
    <View>
      {/* Readout of the tapped month (the last month until a tap). */}
      <View style={styles.readout}>
        <Text style={styles.readoutMonth}>{monthLabel(months[selected] || '')}</Text>
        {shown.map((s, si) => {
          const v = s.values[selected];
          return (
            <View key={s.label} style={styles.readoutItem}>
              <View style={[styles.swatch, { backgroundColor: SERIES_COLORS[si] }]} />
              <Text style={styles.readoutText}>
                {shown.length > 1 ? `${s.label}: ` : ''}
                <Text style={styles.readoutValue}>{v == null ? '—' : format(v)}</Text>
              </Text>
            </View>
          );
        })}
      </View>

      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            {grid.map((g) => (
              <Line key={g} x1={PAD.left} x2={width - PAD.right} y1={y(g)} y2={y(g)} stroke={colors.line} strokeWidth={1} />
            ))}
            {grid.map((g) => (
              <SvgText key={`t${g}`} x={PAD.left - 6} y={y(g) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
                {format(g)}
              </SvgText>
            ))}
            {months.map((m, i) =>
              showLabel(i) ? (
                <SvgText
                  key={m}
                  x={x(i)}
                  y={height - 6}
                  fontSize={10}
                  fill={i === selected ? colors.text : colors.muted}
                  textAnchor={anchorOf(i)}
                >
                  {monthLabel(m)}
                </SvgText>
              ) : null,
            )}
            {active != null ? <Line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.muted} strokeWidth={1} strokeDasharray="3,3" /> : null}
            {shown.map((s, si) => (
              <Path key={s.label} d={pathOf(s.values)} stroke={SERIES_COLORS[si]} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {shown.map((s, si) =>
              s.values.map((v, i) =>
                v == null || (dense && i !== selected && s.values.filter((w) => w != null).length > 2) ? null : (
                  <Circle key={`${s.label}-${i}`} cx={x(i)} cy={y(v)} r={i === selected ? 5 : months.length > 12 ? 3 : 4} fill={SERIES_COLORS[si]} stroke={colors.white} strokeWidth={2} />
                ),
              ),
            )}
          </Svg>
        ) : null}
        {/* Tap targets: one full-height column per month, wider than the markers. */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', left: PAD.left - plotW / Math.max(1, months.length - 1) / 2, right: PAD.right - plotW / Math.max(1, months.length - 1) / 2 }]}>
          {months.map((m, i) => (
            <Pressable
              key={m}
              style={{ flex: 1 }}
              onPress={() => setActive(active === i ? null : i)}
              accessibilityRole="button"
              accessibilityLabel={`${monthLabel(m)}: ${shown.map((s) => `${s.label} ${s.values[i] == null ? '—' : format(s.values[i] as number)}`).join(', ')}`}
            />
          ))}
        </View>
      </View>

      {/* Legend for two or more series, so identity never rests on color alone. */}
      {shown.length > 1 ? (
        <View style={styles.legend}>
          {shown.map((s, si) => (
            <View key={s.label} style={styles.readoutItem}>
              <View style={[styles.swatch, { backgroundColor: SERIES_COLORS[si] }]} />
              <Text style={styles.legendText}>{s.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 6, minHeight: 20 },
  readoutMonth: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  readoutItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  readoutText: { fontSize: 12.5, color: colors.muted },
  readoutValue: { color: colors.text, fontWeight: '700' },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendText: { fontSize: 12, color: colors.text },
});
