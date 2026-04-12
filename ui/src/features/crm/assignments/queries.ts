import type { Assignment, Class, AssignmentFolderSelection } from './types';

export const getAssignmentsForClass = (assignments: Assignment[], classId: number): Assignment[] =>
  assignments.filter((assignment) => assignment.class_id === classId);

export const getPersonalAssignments = (assignments: Assignment[], classes: Class[]): Assignment[] =>
  assignments.filter(
    (assignment) =>
      !assignment.class_id ||
      !classes.find((cls) => (cls.class_id || cls.id) === assignment.class_id)
  );

export const getAssignmentCountForClass = (assignments: Assignment[], classId: number): number =>
  getAssignmentsForClass(assignments, classId).length;

export const getCompletedCountForClass = (assignments: Assignment[], classId: number): number =>
  getAssignmentsForClass(assignments, classId).filter((assignment) => assignment.status === 'Completed').length;

export const getFilteredAssignments = (
  assignments: Assignment[],
  classes: Class[],
  selectedFolder: AssignmentFolderSelection | null
): Assignment[] => {
  if (!selectedFolder) return assignments;
  if (selectedFolder.type === 'class') {
    return getAssignmentsForClass(assignments, selectedFolder.id || 0);
  }
  return getPersonalAssignments(assignments, classes);
};

export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'bg-green-500';
    case 'pending':
      return 'bg-amber-500';
    case 'submitted':
      return 'bg-blue-500';
    case 'graded':
      return 'bg-lime-600';
    default:
      return 'bg-gray-400';
  }
};

