// Application router and top-level shell.

import { useEffect, lazy, Suspense, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './features/crm/hooks';
import { initializeAuth } from './slices/authSlice';
import { fetchCentersForce } from './slices/centersSlice';
import { setAppCenterReady } from './slices/pagesUiSlice';
import Layout from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
const LoginPage = lazy(() => import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const OwnerLoginPage = lazy(() => import('./features/auth/OwnerLoginPage').then((module) => ({ default: module.OwnerLoginPage })));
const OwnerRegisterPage = lazy(() => import('./features/auth/OwnerRegisterPage').then((module) => ({ default: module.OwnerRegisterPage })));
const Dashboard = lazy(() => import('./features/crm/dashboard/Dashboard'));
const OwnerManager = lazy(() => import('./features/owner/OwnerManager'));
const OwnerReports = lazy(() => import('./features/owner/OwnerReports'));
const StudentsPage = lazy(() => import('./features/crm/students/StudentsPage'));
const StudentFormPage = lazy(() => import('./features/crm/students/StudentFormPage'));
const StudentDetailPage = lazy(() => import('./features/crm/students/StudentDetailPage'));
const TeachersPage = lazy(() => import('./features/crm/teachers/TeachersPage'));
const TeacherDetailPage = lazy(() => import('./features/crm/teachers/TeacherDetailPage'));
const PaymentsPage = lazy(() => import('./features/crm/payments/PaymentsPage'));
const PaymentFormPage = lazy(() => import('./features/crm/payments/PaymentFormPage'));
const GradesPage = lazy(() => import('./features/crm/grades/GradesPage'));
const AttendancePage = lazy(() => import('./features/crm/attendance/AttendancePage'));
const ClassesPage = lazy(() => import('./features/crm/classes/ClassesPage'));
const ClassDetailPage = lazy(() => import('./features/crm/classes/ClassDetailPage'));
const CentersPage = lazy(() => import('./features/crm/centers/CentersPage'));
const DebtsPage = lazy(() => import('./features/crm/debts/DebtsPage'));
const FinancePage = lazy(() => import('./features/crm/finance/FinancePage'));
const RoomsPage = lazy(() => import('./features/crm/rooms/RoomsPage'));
const ArchivePage = lazy(() => import('./features/crm/archive/ArchivePage'));
const TelegramRegistrationsPage = lazy(() => import('./features/crm/telegram/TelegramRegistrationsPage'));
const TeacherFinanceDetailPage = lazy(() => import('./features/crm/finance/TeacherFinanceDetailPage'));
const AssignmentsPage = lazy(() => import('./features/crm/assignments/AssignmentsPage'));
const SubjectsPage = lazy(() => import('./features/crm/subjects/SubjectsPage'));
const TestsPage = lazy(() => import('./features/crm/tests/TestsPage'));
const CalendarPage = lazy(() => import('./features/crm/calendar/CalendarPage'));
const CreateTestPage = lazy(() => import('./features/crm/tests/CreateTestPage'));
const TestDetailPage = lazy(() => import('./features/crm/tests/TestDetailPage'));
const TakeTestPage = lazy(() => import('./features/crm/tests/TakeTestPage'));
const StudentTestsPage = lazy(() => import('./features/crm/tests/StudentTestsPage'));
const TestAssignPage = lazy(() => import('./features/crm/tests/TestAssignPage'));
const GradeSubmissionPage = lazy(() => import('./features/crm/tests/GradeSubmissionPage'));
const ViewSubmissionPage = lazy(() => import('./features/crm/tests/ViewSubmissionPage'));
const TeacherPortal = lazy(() => import('./features/teacher/TeacherPortal'));
const StudentPortal = lazy(() => import('./features/student/StudentPortal'));
const SettingsPage = lazy(() => import('./features/crm/settings/SettingsPage'));
const RequestLogsPage = lazy(() => import('./features/crm/logs/RequestLogsPage.tsx'));
const EngineeringPage = lazy(() => import('./features/crm/server/EngineeringPage'));
import { Loader2 } from 'lucide-react';
import { ServiceStatusGuard } from './features/system/components/ServiceStatusGuard';
import { getStoredActiveCenterId, setStoredActiveCenterId } from './shared/auth/authStorage';
import { PERMISSION_CODES } from './types';
import { TOP_STATUS_MESSAGE_EVENT } from './utils/toast';
import { useLanguage } from './i18n/LanguageContext';

const scheduleIdleWork = (callback: () => void) => {
  if (typeof window === 'undefined') return;
  const requestIdle = (window as any).requestIdleCallback;
  if (typeof requestIdle === 'function') {
    requestIdle(() => callback());
    return;
  }
  globalThis.setTimeout(callback, 250);
};

const prefetchPrimaryRoute = (user: any) => {
  if (!user) return;

  if (user.userType === 'student') {
    void import('./features/student/StudentPortal');
    return;
  }

  if (user.userType === 'teacher') {
    void import('./features/teacher/TeacherPortal');
    return;
  }

  if (user.userType === 'superuser' && String(user.role || '').toLowerCase() === 'owner') {
    void import('./features/owner/OwnerManager');
    return;
  }

  if (user.userType === 'superuser') {
    void import('./features/crm/dashboard/Dashboard');
  }
};

// Handles safe log arg.
const safeLogArg = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack || value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return '[Unserializable]';
  }
};

if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    try {
      originalError(...args);
    } catch {
      originalError(...args.map(safeLogArg));
    }
  };
}


// Loading component
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <LoadingLabel />
  </div>
);

const LoadingLabel = () => {
  const { t } = useLanguage();
  return <p className="text-sm text-muted-foreground">{t('Loading...')}</p>;
};

// Unauthorized page
const UnauthorizedPage = () => (
  <UnauthorizedContent />
);

const UnauthorizedContent = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
      <h1 className="text-4xl font-bold text-destructive">{t('Access Denied')}</h1>
      <p className="text-muted-foreground">{t("You don't have permission to access this resource.")}</p>
      <a href="/dashboard" className="text-primary hover:underline font-medium">{t('Go to Dashboard')}</a>
    </div>
  );
};

// Role-based redirect for default/catch-all routes
const RoleBasedRedirect = () => {
  const { isAuthenticated, user, isInitialized } = useAppSelector((state: any) => state.auth);

  if (!isInitialized) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login/superuser" replace />;
  }
  
  switch (user.userType) {
    case 'student':
      return <Navigate to="/student-portal" replace />;
    case 'teacher':
      return <Navigate to="/teacher-portal" replace />;
    case 'superuser':
      if ((user.role || '').toLowerCase() === 'owner') {
        return <Navigate to="/owner/manage" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

// Handles app content.
function AppContent() {
  const dispatch = useAppDispatch();
  const { user, isInitialized } = useAppSelector((state) => state.auth);
  const centerReady = useAppSelector((state) => state.pagesUi.app.centerReady);

// Runs side effects for this component.
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

// Runs side effects for this component.
  useEffect(() => {
// Handles ensure active center.
    const ensureActiveCenter = async () => {
      if (!isInitialized || !user) {
        dispatch(setAppCenterReady(true));
        return;
      }
      const normalizedRole = String(user.role || '').toLowerCase();
      const needsCenterScope = user.userType === 'superuser' && normalizedRole === 'owner';
      if (!needsCenterScope) {
        dispatch(setAppCenterReady(true));
        return;
      }
      const existing = getStoredActiveCenterId();
      if (existing) {
        dispatch(setAppCenterReady(true));
        return;
      }
      dispatch(setAppCenterReady(false));
      try {
        const centers = await dispatch(fetchCentersForce()).unwrap();
        const normalizedCenters = Array.isArray(centers)
          ? centers
              .map((center: any) => Number(center?.center_id || center?.id || 0))
              .filter((centerId: number) => Number.isFinite(centerId) && centerId > 0)
          : [];
        const firstId = normalizedCenters[0];
        const storedCenterId = getStoredActiveCenterId();
        if (storedCenterId && normalizedCenters.includes(storedCenterId)) {
          dispatch(setAppCenterReady(true));
          return;
        }
        if (firstId) {
          setStoredActiveCenterId(Number(firstId));
        }
      } catch {
        // Fallback to route rendering; center-dependent pages handle empty-center state.
      } finally {
        dispatch(setAppCenterReady(true));
      }
    };

    ensureActiveCenter();
  }, [dispatch, isInitialized, user]);

// Runs side effects for this component.
  useEffect(() => {
    if (!isInitialized || !centerReady || !user) return;
    scheduleIdleWork(() => prefetchPrimaryRoute(user));
  }, [centerReady, isInitialized, user]);

  if (!centerReady) {
    return <LoadingSpinner />;
  }

  return (
    <ServiceStatusGuard>
      <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login/owner" element={<OwnerLoginPage />} />
        <Route path="/owner/register" element={<OwnerRegisterPage />} />
        <Route path="/login/superuser" element={<LoginPage userType="superuser" />} />
        <Route path="/login/teacher" element={<LoginPage userType="teacher" />} />
        <Route path="/login/student" element={<LoginPage userType="student" />} />

        {/* Owner Routes */}
        <Route
          path="/owner/manage"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredRole="owner">
              <Layout>
                <OwnerManager />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/reports"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredRole="owner">
              <Layout>
                <OwnerReports />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Unauthorized */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }

        />

        <Route
          path="/students"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_STUDENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <StudentsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students/new"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_STUDENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <StudentFormPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/:studentId"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_STUDENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <StudentDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students/:studentId/edit"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_STUDENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <StudentFormPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students/:studentId/profile"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_STUDENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <StudentDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/students/:studentId"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_STUDENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <StudentDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/archive"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']}>
              <Layout>
                <ArchivePage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/telegram-registrations"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_STUDENT}>
              <Layout>
                <TelegramRegistrationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teachers"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredPermission={PERMISSION_CODES.CRUD_TEACHER}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <TeachersPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/:teacherId"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredPermission={PERMISSION_CODES.CRUD_TEACHER}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <TeacherDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teachers/:teacherId/profile"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredPermission={PERMISSION_CODES.CRUD_TEACHER}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <TeacherDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teachers/:teacherId"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredPermission={PERMISSION_CODES.CRUD_TEACHER}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <TeacherDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments/new"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_PAYMENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <PaymentFormPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments/:paymentId/edit"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_PAYMENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <PaymentFormPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']} requiredPermission={PERMISSION_CODES.CRUD_PAYMENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <PaymentsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredPermission={PERMISSION_CODES.VIEW_FINANCE}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <FinancePage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance/teacher/:teacherId"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredPermission={PERMISSION_CODES.VIEW_FINANCE}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <TeacherFinanceDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/grades"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_GRADE}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <GradesPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_ATTENDANCE}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <AttendancePage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/classes"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_CLASS}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <ClassesPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/classes/:classId"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_CLASS}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <ClassDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rooms"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_ROOM}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <RoomsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/logs"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <RequestLogsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/server"
          element={<Navigate to="/engineering" replace />}
        />

        <Route
          path="/engineering"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <EngineeringPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"

          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher', 'student']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <CalendarPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }


        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.MANAGE_USERS}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <SettingsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/centers"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredRole="owner">
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <CentersPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/debts"
          element={
            <ProtectedRoute requiredUserType="superuser" requiredPermission={PERMISSION_CODES.CRUD_DEBT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <DebtsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/assignments"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_ASSIGNMENT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <AssignmentsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/subjects"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']} requiredPermission={PERMISSION_CODES.CRUD_SUBJECT}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <SubjectsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Tests Routes */}
        <Route
          path="/my-tests"
          element={
            <ProtectedRoute allowedUserTypes={['student']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <StudentTestsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']} requiredPermission={PERMISSION_CODES.MANAGE_TESTS}>

              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <TestsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests/create"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']} requiredPermission={PERMISSION_CODES.MANAGE_TESTS}>

              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <CreateTestPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests/:testId"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']} requiredPermission={PERMISSION_CODES.MANAGE_TESTS}>

              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <TestDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests/:testId/edit"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']} requiredPermission={PERMISSION_CODES.MANAGE_TESTS}>

              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <CreateTestPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests/:testId/assign"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']} requiredPermission={PERMISSION_CODES.MANAGE_TESTS}>

              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <TestAssignPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests/take/:submissionId"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'student']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <TakeTestPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }

        />

        <Route
          path="/tests/submissions/:submissionId/grade"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']} requiredPermission={PERMISSION_CODES.MANAGE_TESTS}>

              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <GradeSubmissionPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tests/submissions/:submissionId"
          element={
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']} requiredPermission={PERMISSION_CODES.MANAGE_TESTS}>

              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <ViewSubmissionPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Teacher Portal */}
        <Route
          path="/teacher-portal"
          element={
            <ProtectedRoute allowedUserTypes={['teacher']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <TeacherPortal />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Student Portal */}
        <Route
          path="/student-portal"
          element={
            <ProtectedRoute allowedUserTypes={['student']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <StudentPortal />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default route - role-aware redirect */}
        <Route path="/" element={<RoleBasedRedirect />} />
        <Route path="*" element={<RoleBasedRedirect />} />
      </Routes>
      </Suspense>
    </ServiceStatusGuard>
  );
}

// Renders the app module.
function App() {
  return (
    <Provider store={store}>
      <HashRouter>
        <TopStatusLine />
        <AppContent />
      </HashRouter>
    </Provider>
  );
}

type TopStatusVariant = 'success' | 'error' | 'warning' | 'info';

const topStatusClasses: Record<TopStatusVariant, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-destructive text-destructive-foreground',
  warning: 'bg-amber-500 text-white',
  info: 'bg-sky-600 text-white',
};

const isTopStatusVariant = (value: unknown): value is TopStatusVariant =>
  value === 'success' || value === 'error' || value === 'warning' || value === 'info';

// Renders one global status line at the top of the viewport.
function TopStatusLine() {
  const [status, setStatus] = useState<{ message: string; variant: TopStatusVariant }>({
    message: '',
    variant: 'info',
  });

  useEffect(() => {
    let timeoutId: number | undefined;

    const handleMessage = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          message?: string;
          variant?: TopStatusVariant;
          autoClose?: number | false;
        }>
      ).detail;
      const nextMessage = detail?.message?.trim() ?? '';
      const nextVariant = isTopStatusVariant(detail?.variant) ? detail.variant : 'info';

      window.clearTimeout(timeoutId);
      setStatus({ message: nextMessage, variant: nextVariant });

      if (!nextMessage || detail?.autoClose === false) return;

      const autoClose = typeof detail?.autoClose === 'number' ? detail.autoClose : 4000;
      timeoutId = window.setTimeout(
        () => setStatus((current) => ({ ...current, message: '' })),
        autoClose,
      );
    };

    window.addEventListener(TOP_STATUS_MESSAGE_EVENT, handleMessage);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener(TOP_STATUS_MESSAGE_EVENT, handleMessage);
    };
  }, []);

  if (!status.message) return null;

  return (
    <div
      role={status.variant === 'error' ? 'alert' : 'status'}
      className={`fixed left-0 right-0 top-0 z-[10000] px-4 py-2 text-center text-sm font-medium shadow-sm ${topStatusClasses[status.variant]}`}
    >
      <span className="mx-auto block max-w-screen-xl truncate">{status.message}</span>
    </div>
  );
}

export default App;
