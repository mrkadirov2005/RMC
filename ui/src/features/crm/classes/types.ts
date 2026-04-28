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
  payment_amount: number;
  payment_frequency: string;
}

export interface ClassSchedule {
  days: string[];
  time: string;
}

