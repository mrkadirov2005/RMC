export interface GradeEntry {
  student_id: number;
  percentage: number;
  grade_letter: string;
}

export interface TeacherStudent {
  student_id?: number;
  id?: number;
  teacher_id?: number;
  class_id?: number;
  enrollment_number?: string;
  first_name?: string;
  last_name?: string;
}

export const getTeacherInitials = (firstName: string, lastName: string) =>
  `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

export const getTeacherStatusClasses = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-800 border-green-300';
    case 'inactive': return 'bg-red-100 text-red-800 border-red-300';
    case 'on leave': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getGradeBadgeClasses = (letter: string) => {
  switch (letter) {
    case 'A': return 'bg-green-100 text-green-800';
    case 'B': return 'bg-blue-100 text-blue-800';
    case 'C': return 'bg-sky-100 text-sky-800';
    case 'D': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-red-100 text-red-800';
  }
};

export const calculateGradeLetter = (percentage: number): string => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

export const getStudentName = (student: TeacherStudent) =>
  `${student.first_name || ''} ${student.last_name || ''}`;

export const compareStudentsByName = (a: TeacherStudent, b: TeacherStudent) =>
  getStudentName(a).localeCompare(getStudentName(b));
