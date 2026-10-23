import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerLoadPanel } from './ServerLoadPanel';
import { TrafficPanel } from './TrafficPanel';
import { formatClock, formatMinutes, hourLabel, type History, type Traffic } from './monitoringModel';

describe('monitoring helpers', () => {
  it('shows times in Tashkent whatever the computer clock says', () => {
    expect(formatClock('2026-10-22T10:00:00Z')).toBe('15:00');
    expect(hourLabel(7)).toBe('07:00');
    expect(formatMinutes(135)).toBe('2h 15m');
    expect(formatMinutes(12)).toBe('12m');
  });
});

describe('monitoring panels without data', () => {
  it('say why there is nothing to chart', () => {
    const empty: History = { enabled: true, days: 1, bucketMinutes: 5, points: [], outages: [], restarts: [], summary: null };
    const { rerender } = render(<ServerLoadPanel history={empty} />);
    expect(screen.getByText(/No samples yet/)).toBeTruthy();
    rerender(<ServerLoadPanel history={{ ...empty, enabled: false }} />);
    expect(screen.getByText(/MongoDB is not connected/)).toBeTruthy();
    const traffic: Traffic = { enabled: true, days: 7, series: [], hours: [], summary: { total: 0, errors: 0, slow: 0, avgMs: 0, errorPercent: 0, busiestHour: null, quietestHour: null }, quietWindow: null };
    rerender(<TrafficPanel traffic={traffic} />);
    expect(screen.getByText(/No requests were logged/)).toBeTruthy();
  });
});
