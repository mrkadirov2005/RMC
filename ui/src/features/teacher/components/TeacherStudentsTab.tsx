// Tab component for the teacher feature.

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { studentAPI } from '../api';
import { useAppSelector } from '../../crm/hooks';
import { useLanguage } from '../../../i18n/LanguageContext';
import TeacherStudentDirectory, { type TeacherStudentItem } from './TeacherStudentDirectory';

interface TeacherStudentsTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherStudentsTab = ({ teacherId, onRefresh: _onRefresh }: TeacherStudentsTabProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const { t } = useLanguage();
  const effectiveTeacherId = teacherId ?? user?.id;
  const [students, setStudents] = useState<TeacherStudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadStudents();
  }, [effectiveTeacherId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getAll(
        effectiveTeacherId ? { teacher_id: Number(effectiveTeacherId), page: 1, limit: 100 } : { page: 1, limit: 100 }
      );
      const payload = response.data || [];
      const scopedStudents = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
      setStudents(scopedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <TeacherStudentDirectory students={students} title={t("Mening o'quvchilarim")} />;
};

export default TeacherStudentsTab;
