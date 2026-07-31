import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, BadgePercent, CheckCircle2, GraduationCap, Loader2, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { useLanguage } from '@/i18n/LanguageContext';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { createStudentIdentity } from '@/shared/studentIdentity';
import { studentAPI } from './api';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useStudentsData } from './hooks/useStudentsData';
import { useAppSelector } from '../hooks';
import type { Student } from './types';
import { StudentFormFields } from './components/StudentFormFields';
import { studentGenderOptions, studentStatusOptions } from './utils/studentFormOptions';

const normalizeStudentFormData = (student: Student): Partial<Student> => ({
  ...student,
  password: '',
  is_discounted: Boolean(student.is_discounted),
  discount_kind: student.discount_kind || 'serial_discount',
  discount_value_type: student.discount_value_type || 'fixed',
});

const StudentFormPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const isEditing = Boolean(studentId);
  const { user } = useAppSelector((state) => state.auth);
  const defaultCenterId = getResolvedCenterId(user) ?? 0;
  const options = useStudentsData({ page: 1, limit: 1 });
  const [formData, setFormData] = useState<Partial<Student>>({
    center_id: defaultCenterId,
    gender: 'Male',
    status: 'Active',
    username: '',
    password: '',
    discount_kind: 'serial_discount',
    discount_value_type: 'fixed',
  });
  const [loadingStudent, setLoadingStudent] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCenterField = options.isOwner;
  const title = isEditing ? t('Edit Student') : t('Add Student');

  const selectedClass = useMemo(
    () => options.classes.find((item) => Number(item.class_id || item.id) === Number(formData.class_id)),
    [formData.class_id, options.classes]
  );

  useEffect(() => {
    if (!isEditing || !studentId) return;
    let alive = true;
    const loadStudent = async () => {
      try {
        setLoadingStudent(true);
        setError(null);
        const response = await studentAPI.getById(Number(studentId));
        if (!alive) return;
        setFormData(normalizeStudentFormData(response.data || response));
      } catch (err: any) {
        if (!alive) return;
        setError(err?.response?.data?.error || err?.message || 'Failed to load student.');
      } finally {
        if (alive) setLoadingStudent(false);
      }
    };
    loadStudent();
    return () => {
      alive = false;
    };
  }, [isEditing, studentId]);

  useEffect(() => {
    if (isEditing) return;
    setFormData((current) => ({ ...current, center_id: current.center_id || defaultCenterId }));
  }, [defaultCenterId, isEditing]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEditing && studentId) {
        await studentAPI.update(Number(studentId), formData);
        showToast.success('Student updated successfully!');
      } else {
        await studentAPI.create({
          ...formData,
          ...createStudentIdentity(),
        });
        showToast.success('Student created successfully!');
      }
      navigate('/students');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.details || err?.message || 'Error saving student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/students')} className="h-9 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('Back')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {(error || options.state.error) && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(error || options.state.error)}</AlertDescription>
          </Alert>
        )}

        {loadingStudent ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border bg-card">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('Loading...')}
            </div>
          </div>
        ) : (
          <>
            <StudentFormFields
              formData={formData}
              setFormData={setFormData}
              centerOptions={options.centerOptions}
              classOptions={options.classOptions}
              teacherOptions={options.teacherOptions}
              genderOptions={studentGenderOptions}
              statusOptions={studentStatusOptions}
              showCenterField={showCenterField}
            />

            <section className="grid gap-2.5 md:grid-cols-3">
              <div className="rounded-lg border border-sky-300 bg-sky-200 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-sky-950">
                  <GraduationCap className="h-3.5 w-3.5 text-sky-700" />
                  {t('Class')}
                </div>
                <p className="mt-1 text-sm font-semibold text-sky-900">
                  {selectedClass?.class_name || t('No class selected')}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-300 bg-emerald-200 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-950">
                  <BadgePercent className="h-3.5 w-3.5 text-emerald-700" />
                  {t('Discount')}
                </div>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {formData.is_discounted
                    ? formData.discount_kind === 'monthly_discount'
                      ? t('One-time discount enabled')
                      : t('Serial discount enabled')
                    : t('No discount')}
                </p>
              </div>
              <div className="rounded-lg border border-rose-300 bg-rose-200 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-rose-950">
                  <CheckCircle2 className="h-3.5 w-3.5 text-rose-700" />
                  {t('Status')}
                </div>
                <p className="mt-1 text-sm font-semibold text-rose-900">{formData.status || t('Not set')}</p>
              </div>
            </section>

            <div className="sticky bottom-3 z-10 flex justify-end gap-2 rounded-lg border border-violet-300 bg-violet-200 p-2.5 shadow-lg">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate('/students')} disabled={saving}>
                {t('Cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={saving || loadingStudent} className="gap-2 bg-rose-600 hover:bg-rose-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? t('Saving...') : t('Save')}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default StudentFormPage;
