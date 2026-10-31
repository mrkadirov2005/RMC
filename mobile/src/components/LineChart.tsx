import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/tokens';

// @MOB-127 Series colors in fixed order (validated: CVD and contrast pass on white; the third
// is below 3:1 contrast, so lines are always direct-labeled or listed in the legend).
export const SERIES_COLORS = ['#205FB6', '#EB6834', '#1BAF7A'];

export type Series = { label: string; values: (number | null)[] };

type Props = {
  months: string[];
  series: Series[];
  max?: number;
  format?: (value: number) => string;
  height?: number;
  monthLabel?: (month: string) => string;
};

const PAD = { top: 12, right: 12, bottom: 22, left: 34 };

const niceMax = (value: number) => {
  if (value <= 0) return 10;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
};

// @MOB-127 Small line chart: one y-axis, recessive grid, 2px lines, 8px markers, gaps where a
// month has no data. Tap a month to read every series' value for it.
export function LineChart({ months, series, max, format = (v) => String(v), height = 170, monthLabel = (m) => m.slice(5) }: Props) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const shown = series.slice(0, SERIES_COLORS.length);
  const values = shown.flatMap((s) => s.values).filter((v): v is number => v != null);
  const top = max ?? niceMax(Math.max(...values, 0));

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (months.length > 1 ? (plotW * i) / (months.length - 1) : plotW / 2);
  const y = (v: number) => PAD.top + plotH - (plotH * Math.max(0, Math.min(v, top))) / top;

  // Lines break at missing months instead of inventing values.
  const pathOf = (vals: (number | null)[]) => {
    let d = '';
    let open = false;
    vals.forEach((v, i) => {
      if (v == null) {
        open = false;
        return;
      }
      d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      open = true;
    });
    return d;
  };

  const grid = [0, 0.5, 1].map((f) => Math.round(top * f));
  const selected = active ?? months.length - 1;

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
            {months.map((m, i) => (
              <SvgText key={m} x={x(i)} y={height - 6} fontSize={10} fill={i === selected ? colors.text : colors.muted} textAnchor="middle">
                {monthLabel(m)}
              </SvgText>
            ))}
            {active != null ? <Line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.muted} strokeWidth={1} strokeDasharray="3,3" /> : null}
            {shown.map((s, si) => (
              <Path key={s.label} d={pathOf(s.values)} stroke={SERIES_COLORS[si]} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {shown.map((s, si) =>
              s.values.map((v, i) =>
                v == null ? null : (
                  <Circle key={`${s.label}-${i}`} cx={x(i)} cy={y(v)} r={i === selected ? 5 : 4} fill={SERIES_COLORS[si]} stroke={colors.white} strokeWidth={2} />
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
