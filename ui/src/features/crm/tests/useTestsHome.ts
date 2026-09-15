// Where "back" leads from any test screen. Each kind of user reaches tests from a
// different home — teachers from the Tests tab of their portal, students from My
// tests, staff from the Tests section — so a hard-coded /tests sent teachers to a
// page that is not theirs.

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setTeacherPortalTabValue } from '../../../slices/pagesUiSlice';
import { useAppDispatch, useAppSelector } from '../hooks';

export interface TestsHome {
  path: string;
  label: string;
}

export const resolveTestsHome = (userType?: string | null): TestsHome => {
  if (userType === 'teacher') return { path: '/teacher-portal', label: 'Back to my tests' };
  if (userType === 'student') return { path: '/my-tests', label: 'Back to my tests' };
  return { path: '/tests', label: 'Back to Tests' };
};

export const useTestsHome = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userType = useAppSelector((state) => state.auth.user?.userType);
  const home = resolveTestsHome(userType);

  const goHome = useCallback(() => {
    // Land a teacher on the Tests tab they came from, not whichever tab was open last.
    if (userType === 'teacher') dispatch(setTeacherPortalTabValue('tests'));
    navigate(home.path);
  }, [dispatch, navigate, home.path, userType]);

  // From a screen about one test. Staff return to that test's page; a teacher's
  // tests live in the portal, so they return there instead of the staff screen.
  const goToTest = useCallback(
    (testId: number | string | null | undefined) => {
      if (userType === 'teacher' || testId == null) {
        goHome();
        return;
      }
      navigate(`/tests/${testId}`);
    },
    [goHome, navigate, userType]
  );

  const testLabel = userType === 'teacher' ? home.label : 'Back to test';

  return { ...home, goHome, goToTest, testLabel };
};
