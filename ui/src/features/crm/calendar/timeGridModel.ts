export const HOUR_HEIGHT = 52;
export const DAY_MINUTES = 24 * 60;

export const timeToMinutes = (value?: string) => {
  const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return Math.min(DAY_MINUTES, Math.max(0, hours * 60 + minutes));
};

export const eventPosition = (start?: string, end?: string) => {
  const startMinutes = timeToMinutes(start);
  const endMinutes = Math.max(startMinutes + 20, timeToMinutes(end));
  return {
    top: (startMinutes / 60) * HOUR_HEIGHT,
    height: Math.max(24, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT),
  };
};

/**
 * Assign overlapping events to columns so every event remains clickable.
 * Events that only touch at their boundary are not considered overlapping.
 */
export const layoutOverlappingEvents = <T extends { start_time?: string; end_time?: string }>(events: T[]) => {
    const sorted = [...events].sort((a, b) =>
      timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      || timeToMinutes(a.end_time) - timeToMinutes(b.end_time),
    );
    const columns: T[][] = [];
    const columnByEvent = new Map<T, number>();

    sorted.forEach((event) => {
      const start = timeToMinutes(event.start_time);
      const end = Math.max(start + 1, timeToMinutes(event.end_time));
      let column = 0;
      while (columns[column]?.some((other) => {
        const otherStart = timeToMinutes(other.start_time);
        const otherEnd = Math.max(otherStart + 1, timeToMinutes(other.end_time));
        return start < otherEnd && end > otherStart;
      })) column += 1;
      if (!columns[column]) columns[column] = [];
      columns[column].push(event);
      columnByEvent.set(event, column);
    });

    return events.map((event) => {
      const start = timeToMinutes(event.start_time);
      const end = Math.max(start + 1, timeToMinutes(event.end_time));
      const overlapping = sorted.filter((other) => {
        const otherStart = timeToMinutes(other.start_time);
        const otherEnd = Math.max(otherStart + 1, timeToMinutes(other.end_time));
        return start < otherEnd && end > otherStart;
      });
      const totalColumns = Math.max(1, ...overlapping.map((other) => (columnByEvent.get(other) || 0) + 1));
      const column = columnByEvent.get(event) || 0;
      return {
        event,
        position: {
          ...eventPosition(event.start_time, event.end_time),
          left: `${(column * 100) / totalColumns}%`,
          width: `${100 / totalColumns}%`,
        },
      };
    });
};


export const clockLabels = Array.from({ length: 25 }, (_, hour) =>
  `${String(hour).padStart(2, '0')}:00`
);
