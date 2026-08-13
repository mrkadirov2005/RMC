import type { RoomAssignment } from './roomModel';

export type RoomsTab = 'overview' | 'availability' | 'teacher' | 'subject' | 'reports';

export type RoomWorkspaceFilters = {
  date: string;
  start: string;
  end: string;
  room: string;
  teacherId: string;
  subject: string;
};

export type RoomScheduleRow = RoomAssignment & {
  teacher_id?: number | null;
  teacher_name?: string | null;
  subject_name?: string | null;
  subject_id?: number | null;
  student_count?: number | null;
  status?: string;
};

export type RoomAvailabilityRow = {
  roomId: number;
  roomNumber: string;
  available: boolean;
  nextLesson: string;
  freeUntil: string;
  assignment?: RoomScheduleRow;
};

export type RoomUtilizationRow = {
  roomNumber: string;
  bookedMinutes: number;
  availableMinutes: number;
  utilization: number;
};
