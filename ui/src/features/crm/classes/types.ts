// Shared TypeScript types.

export interface Class {
  class_id?: number;
  id?: number;
  center_id: number;
  class_name: string;
  subject_id?: number;
  subject_name?: string;
  class_code: string;
  level: number;
  section?: string;
  capacity: number;
  teacher_id?: number;
  room_number: string;
  start_date?: string | null;
  end_date?: string | null;
  payment_amount: number;
  payment_frequency: string;
  /** The subject level whose price the group takes (null: its own price). */
  level_id?: number | null;
  level_name?: string | null;
  /** Form only: the chosen level's price. */
  level_price?: number | null;
}

export interface ClassSchedule {
  days: string[];
  time: string;
  endTime?: string;
}
