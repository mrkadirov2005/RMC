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

export const clockLabels = Array.from({ length: 25 }, (_, hour) =>
  `${String(hour).padStart(2, '0')}:00`
);
