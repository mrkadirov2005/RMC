export type UserType = 'owner' | 'superuser' | 'teacher' | 'student' | 'parent' | 'system';

export interface CurrentUser {
  id: number;
  userType: UserType;
  role?: string;
  center_id?: number | null;
  centerId?: number | null;
  class_id?: number | null;
}
