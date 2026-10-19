// Month-over-month change as a change in students: new students add, leavers take away.
// So 158 left this month after 1 last month reads -157 (a loss), not +157.
export const studentMonthChange = (view: 'intake' | 'retention', delta: number, deltaPercent: number) => {
  const sign = view === 'intake' ? 1 : -1;
  const value = sign * Number(delta || 0);
  const percent = sign * Number(deltaPercent || 0);
  const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;
  return {
    value: signed(value),
    percent: `${signed(percent)}%`,
    direction: value > 0 ? 'gain' : value < 0 ? 'loss' : 'flat',
  } as const;
};
