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

interface AssignmentsTabProps {
  assignments: Assignment[];
  studentClassId: number | undefined;
  studentId: number | undefined;
  centerId?: number;
  onRefresh: () => void;
}

export const AssignmentsTab = ({ assignments, studentClassId, studentId, centerId, onRefresh }: AssignmentsTabProps) => {
  return (
    <AssignmentSection 
      assignments={assignments} 
      studentClassId={studentClassId}
      studentId={studentId}
      centerId={centerId}
      scope="class"
      onRefresh={onRefresh} 
    />
  );
};
