import { useAppDispatch, useAppSelector } from '../crm/hooks';
import { selectTeacherPortalUi } from '../../store/selectors';
import { setTeacherPortalTabValue } from '../../slices/pagesUiSlice';
import { useUrlTab } from '@/shared/hooks/useUrlTab';

export const TEACHER_PORTAL_TABS = ['overall', 'statistics', 'consolidations', 'classes', 'tests', 'calendar', 'attendance', 'assignments', 'tasks', 'profile'] as const;
type TeacherPortalTab = (typeof TEACHER_PORTAL_TABS)[number];

/**
 * The teacher portal's open tab. It is in the address (?tab=attendance), so a reload stays on it.
 * Without one (back from a lesson to /teacher-portal) it is the tab the teacher was last on.
 */
export const useTeacherPortalTab = () => {
  const dispatch = useAppDispatch();
  const lastTab = useAppSelector(selectTeacherPortalUi).tabValue as TeacherPortalTab;
  const [tabValue, setUrlTab] = useUrlTab<TeacherPortalTab>(
    TEACHER_PORTAL_TABS.includes(lastTab) ? lastTab : 'overall',
    TEACHER_PORTAL_TABS,
    'tab',
    { keepDefault: true }
  );
  const setTabValue = (value: string) => {
    dispatch(setTeacherPortalTabValue(value));
    setUrlTab(value);
  };
  return [tabValue, setTabValue] as const;
};
