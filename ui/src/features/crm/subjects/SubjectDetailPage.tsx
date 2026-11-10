// A subject's own page (Fanlar → a subject): its levels, each level's price and groups, and
// "Add level". Groups take their level's price.
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSubjectsPage } from './hooks/useSubjectsPage';
import { buildSubjectCatalog, getSubjectTeacherCount } from './subjectCatalog';
import { SubjectLevelsPanel } from './components/SubjectLevelsPanel';
import { useAppDispatch } from '@/features/crm/hooks';
import { fetchClassesForce } from '@/slices/classesSlice';

const statTileClass = 'rounded-md bg-gradient-to-br p-2 text-white shadow-sm';

const SubjectDetailPage = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const { state, classes } = useSubjectsPage();
  const id = Number(subjectId || 0);

  // The subject in the catalog (rows of the same name, one per group, merged).
  const subject = useMemo(() => {
    const row = state.items.find((item: any) => Number(item.subject_id || item.id) === id);
    if (!row) return null;
    const name = String((row as any).subject_name || '').trim().toLowerCase();
    return buildSubjectCatalog(state.items).find((entry) => String(entry.subject_name || '').trim().toLowerCase() === name) || null;
  }, [id, state.items]);

  const groupOptions = useMemo(
    () =>
      classes
        .map((cls: any) => ({
          class_id: Number(cls.class_id || cls.id || 0),
          class_name: cls.class_name,
          level_id: cls.level_id ?? null,
          level_name: cls.level_name ?? null,
        }))
        .filter((cls) => cls.class_id > 0),
    [classes]
  );

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 via-cyan-50 to-emerald-50 p-4 shadow-sm dark:border-border dark:from-card dark:via-card dark:to-card">
        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('/subjects')} title={t('Back')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span data-keep-bg className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-600 text-white">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-slate-950 dark:text-foreground">{subject?.subject_name || t('Subject')}</h1>
          {subject?.subject_code && <p className="text-xs text-muted-foreground">{subject.subject_code}</p>}
        </div>
      </div>

      {subject && (
        <div className="grid grid-cols-3 gap-3">
          <div className={`${statTileClass} from-violet-500 to-indigo-600`}>
            <p className="text-[0.625rem] font-black uppercase text-white/75">{t('Groups')}</p>
            <p className="text-2xl font-black">{subject.assignments.length}</p>
          </div>
          <div className={`${statTileClass} from-fuchsia-500 to-pink-600`}>
            <p className="text-[0.625rem] font-black uppercase text-white/75">{t('Teachers')}</p>
            <p className="text-2xl font-black">{getSubjectTeacherCount(subject)}</p>
          </div>
          <div className={`${statTileClass} from-emerald-500 to-teal-600`}>
            <p className="text-[0.625rem] font-black uppercase text-white/75">{t('Passing Marks')}</p>
            <p className="text-2xl font-black">{subject.passing_marks}/{subject.total_marks}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        {id > 0 ? (
          <SubjectLevelsPanel subjectId={id} groups={groupOptions} onGroupsChanged={() => void dispatch(fetchClassesForce())} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('Subject not found')}</p>
        )}
      </div>
    </div>
  );
};

export default SubjectDetailPage;
