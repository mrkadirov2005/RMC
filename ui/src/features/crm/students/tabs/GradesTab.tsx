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
}

export const GradesTab = ({ grades, onRefresh, studentId, classId }: GradesTabProps) => {
  return <GradesSection grades={grades} onRefresh={onRefresh} studentId={studentId} classId={classId} />;
};
