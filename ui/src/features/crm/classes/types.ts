// Shared TypeScript types.

export interface Class {
  class_id?: number;
  id?: number;
  center_id: number;
  class_name: string;
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
}

export interface ClassSchedule {
  days: string[];
  time: string;
  endTime?: string;
}
