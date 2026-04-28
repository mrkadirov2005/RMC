// Tab component for the crm feature.

import { GradesSection } from '../components/GradesSection';

interface Grade {
  grade_id?: number;
  id?: number;
  percentage: number;
  grade_letter: string;
  term: string;
  subject_name?: string;
}

interface GradesTabProps {
  grades: Grade[];
  onRefresh: () => void;
  studentId?: number;
  classId?: number;
  teacherId?: number;
  centerId?: number;
}

// Renders the grades tab tab.
export const GradesTab = ({ grades, onRefresh, studentId, classId, teacherId, centerId }: GradesTabProps) => {
  return (
    <GradesSection
      grades={grades}
      onRefresh={onRefresh}
      studentId={studentId}
      classId={classId}
      teacherId={teacherId}
      centerId={centerId}
    />
  );
};
