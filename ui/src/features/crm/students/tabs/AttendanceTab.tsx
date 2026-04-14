import { AttendanceSection } from '../components/AttendanceSection';

interface Attendance {
  attendance_id?: number;
  id?: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

interface AttendanceTabProps {
  attendance: Attendance[];
  studentId?: number;
  studentClassId?: number;
  centerId?: number;
  teacherId?: number;
  onRefresh: () => void;
}

export const AttendanceTab = ({
  attendance,
  studentId,
  studentClassId,
  centerId,
  teacherId,
  onRefresh,
}: AttendanceTabProps) => {
  return (
    <AttendanceSection
      attendance={attendance}
      studentId={studentId}
      studentClassId={studentClassId}
      centerId={centerId}
      teacherId={teacherId}
      onRefresh={onRefresh}
    />
  );
};
