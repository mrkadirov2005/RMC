import { useCallback, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface TimelineRange {
  start: string;
  end: string;
}

interface TimelineProps {
  /** Earliest available date (YYYY-MM-DD) across all lessons. */
  min: string;
  /** Latest available date (YYYY-MM-DD) across all lessons. */
  max: string;
  /** Selected range start (YYYY-MM-DD). */
  start: string;
  /** Selected range end (YYYY-MM-DD). */
  end: string;
  /** Dates (YYYY-MM-DD) where a lesson happened, rendered as ticks. */
  markers?: string[];
  /** When provided, the timeline becomes draggable: click-drag to pick a new range, or drag either handle to resize it. */
  onChange?: (range: TimelineRange) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toTime = (dateKey: string) => new Date(`${dateKey}T00:00:00`).getTime();

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type DragMode = 'start' | 'end' | 'range' | null;

export const Timeline = ({ min, max, start, end, markers = [], onChange }: TimelineProps) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);

  const { minTime, maxTime, percentOf } = useMemo(() => {
    const minT = toTime(min);
    const maxT = toTime(max);
    const span = Math.max(maxT - minT, 1);
    return {
      minTime: minT,
      maxTime: maxT,
      percentOf: (dateKey: string) => {
        const time = toTime(dateKey);
        if (!Number.isFinite(time)) return 0;
        return Math.min(100, Math.max(0, ((time - minT) / span) * 100));
      },
    };
  }, [min, max]);

  const dateFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const percent = rect.width > 0 ? ((clientX - rect.left) / rect.width) * 100 : 0;
      const clamped = Math.min(100, Math.max(0, percent));
      const time = minTime + (clamped / 100) * (maxTime - minTime);
      const rounded = Math.round(time / DAY_MS) * DAY_MS;
      return toDateKey(new Date(rounded));
    },
    [min, minTime, maxTime]
  );

  const interactive = Boolean(onChange) && Boolean(min) && Boolean(max);

  const beginHandleDrag = (mode: 'start' | 'end') => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragMode(mode);
  };

  const beginTrackDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const date = dateFromClientX(event.clientX);
    setRangeAnchor(date);
    setDragMode('range');
    event.currentTarget.setPointerCapture(event.pointerId);
    onChange?.({ start: date, end: date });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragMode || !interactive) return;
    const date = dateFromClientX(event.clientX);
    if (dragMode === 'start') {
      onChange?.({ start: date > end ? end : date, end });
    } else if (dragMode === 'end') {
      onChange?.({ start, end: date < start ? start : date });
    } else if (dragMode === 'range' && rangeAnchor) {
      onChange?.(rangeAnchor <= date ? { start: rangeAnchor, end: date } : { start: date, end: rangeAnchor });
    }
  };

  const endDrag = () => {
    setDragMode(null);
    setRangeAnchor(null);
  };

  if (!min || !max) return null;

  const startPercent = percentOf(start || min);
  const endPercent = percentOf(end || max);
  const left = Math.min(startPercent, endPercent);
  const width = Math.max(Math.abs(endPercent - startPercent), 1);

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/40">
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span>{min}</span>
        <span>{interactive ? 'Drag to pick a range' : 'Full available range'}</span>
        <span>{max}</span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={beginTrackDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative h-3 w-full touch-none rounded-full bg-slate-200 dark:bg-slate-800 ${interactive ? 'cursor-pointer' : ''}`}
      >
        <div
          className="pointer-events-none absolute inset-y-0 rounded-full bg-blue-500/70 transition-all"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        {markers.map((marker, index) => (
          <span
            key={`${marker}-${index}`}
            className="pointer-events-none absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500/80 dark:bg-slate-300/70"
            style={{ left: `${percentOf(marker)}%` }}
            title={marker}
          />
        ))}
        {interactive && (
          <>
            <button
              type="button"
              onPointerDown={beginHandleDrag('start')}
              aria-label="Adjust range start"
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-blue-600 shadow-sm ring-1 ring-blue-700/40 hover:scale-110 dark:border-slate-900"
              style={{ left: `${startPercent}%` }}
            />
            <button
              type="button"
              onPointerDown={beginHandleDrag('end')}
              aria-label="Adjust range end"
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-blue-600 shadow-sm ring-1 ring-blue-700/40 hover:scale-110 dark:border-slate-900"
              style={{ left: `${endPercent}%` }}
            />
          </>
        )}
      </div>
      <div className="mt-2 text-center text-[11px] font-bold text-blue-700 dark:text-blue-300">
        {start || min} <span className="text-slate-400">→</span> {end || max}
      </div>
    </div>
  );
};
