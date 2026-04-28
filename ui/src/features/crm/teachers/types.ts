// Shared TypeScript types.

export interface Teacher {
  teacher_id?: number;
  id?: number;
  center_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  qualification: string;
  specialization: string;
  status: string;
  roles?: string[];
  username?: string;
  password?: string;
}

