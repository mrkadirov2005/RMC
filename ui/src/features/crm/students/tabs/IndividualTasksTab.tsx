// Tab component for the crm feature.

import { AssignmentSection } from '../components/AssignmentSection';

interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  student_id?: number;
  assignment_title: string;
  due_date: string;
  status: string;
  grade?: number;
}

interface IndividualTasksTabProps {
  assignments: Assignment[];
  studentId: number | undefined;
  centerId?: number;
  studentClassId?: number;
  onRefresh: () => void;
}

// Renders the individual tasks tab tab.
export const IndividualTasksTab = ({ assignments, studentId, centerId, studentClassId, onRefresh }: IndividualTasksTabProps) => {
  const individualTasksAssignments = assignments.filter(
    (a) => Number(a.student_id) === Number(studentId)
  );

  return (
    <AssignmentSection 
      assignments={individualTasksAssignments}
      studentClassId={studentClassId}
      studentId={studentId}
      centerId={centerId}
      scope="individual"
      onRefresh={onRefresh}
    />
  );
};
