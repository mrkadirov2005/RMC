import type { ReactNode } from 'react';

export type StudentChartMode = 'pie' | 'bar' | 'line';

export interface StudentStatRow {
  label: string;
  count: number;
  color?: string;
}

export interface StudentStatSlide {
  title: string;
  description: string;
  rows: StudentStatRow[];
  total: number;
  overview?: ReactNode;
}
