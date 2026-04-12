export interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  assignment_title: string;
  description: string;
  due_date: string;
  submission_date: string;
  status: string;
  grade?: number;
}

export interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
}

export type AssignmentTabType = 'classes' | 'personal';
export type AssignmentFolderType = 'class' | 'personal';

export interface AssignmentFolderSelection {
  type: AssignmentFolderType;
  id?: number;
  name: string;
}

