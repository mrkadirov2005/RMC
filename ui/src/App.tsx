import { useEffect, lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './features/crm/hooks';
import { initializeAuth } from './slices/authSlice';
import Layout from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { OwnerLoginPage } from './pages/auth/OwnerLoginPage';
import Dashboard from './features/crm/dashboard/Dashboard';
import OwnerManager from './pages/owner/OwnerManager';
import StudentsPage from './features/crm/students/StudentsPage';
import StudentDetailPage from './features/crm/students/StudentDetailPage';
import TeachersPage from './features/crm/teachers/TeachersPage';
import TeacherDetailPage from './features/crm/teachers/TeacherDetailPage';
import PaymentsPage from './features/crm/payments/PaymentsPage';
import GradesPage from './features/crm/grades/GradesPage';
import AttendancePage from './features/crm/attendance/AttendancePage';
import ClassesPage from './features/crm/classes/ClassesPage';
import CentersPage from './features/crm/centers/CentersPage';
import DebtsPage from './features/crm/debts/DebtsPage';
import FinancePage from './features/crm/finance/FinancePage';
import RoomsPage from './features/crm/rooms/RoomsPage';

import TeacherFinanceDetailPage from './features/crm/finance/TeacherFinanceDetailPage';
import AssignmentsPage from './features/crm/assignments/AssignmentsPage';
import SubjectsPage from './features/crm/subjects/SubjectsPage';
import TestsPage from './features/crm/tests/TestsPage';
const CalendarPage = lazy(() => import('./features/crm/calendar/CalendarPage'));
import CreateTestPage from './features/crm/tests/CreateTestPage';
import TestDetailPage from './features/crm/tests/TestDetailPage';
import TakeTestPage from './features/crm/tests/TakeTestPage';
import StudentTestsPage from './features/crm/tests/StudentTestsPage';
import TestAssignPage from './features/crm/tests/TestAssignPage';
import GradeSubmissionPage from './features/crm/tests/GradeSubmissionPage';
import ViewSubmissionPage from './features/crm/tests/ViewSubmissionPage';
import TeacherPortal from './features/teacher/TeacherPortal';
import StudentPortal from './features/student/StudentPortal';
const SettingsPage = lazy(() => import('./features/crm/settings/SettingsPage'));
import { useThemeMode } from './theme/ThemeContext';
import { Loader2 } from 'lucide-react';
import { ServiceStatusGuard } from './features/system/components/ServiceStatusGuard';
import { centerAPI } from './shared/api/api';
import { getStoredActiveCenterId, setStoredActiveCenterId } from './shared/auth/authStorage';

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
    <p className="text-sm text-muted-foreground">Loading...</p>
  </div>
);

// Unauthorized page
const UnauthorizedPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
    <h1 className="text-4xl font-bold text-destructive">Access Denied</h1>
    <p className="text-muted-foreground">You don't have permission to access this resource.</p>
    <a href="/dashboard" className="text-primary hover:underline font-medium">Go to Dashboard</a>
  </div>
);

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

function AppContent() {
  const dispatch = useAppDispatch();
  const { user, isInitialized } = useAppSelector((state) => state.auth);
  const [centerReady, setCenterReady] = useState(true);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    const ensureActiveCenter = async () => {
      if (!isInitialized || !user) {
        setCenterReady(true);
        return;
      }
      const normalizedRole = String(user.role || '').toLowerCase();
      const needsCenterScope = user.userType === 'superuser' && normalizedRole !== 'admin';
      if (!needsCenterScope) {
        setCenterReady(true);
        return;
      }
      const existing = getStoredActiveCenterId();
      if (existing) {
        setCenterReady(true);
        return;
      }
      setCenterReady(false);
      try {
        const response = await centerAPI.getAll();
        const centers = Array.isArray(response) ? response : response.data || [];
        const firstId = centers[0]?.center_id || centers[0]?.id;
        if (firstId) {
          setStoredActiveCenterId(Number(firstId));
        }
      } finally {
        setCenterReady(true);
      }
    };

    ensureActiveCenter();
  }, [isInitialized, user]);

  if (!centerReady) {
    return <LoadingSpinner />;
  }

  return (
    <ServiceStatusGuard>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login/owner" element={<OwnerLoginPage />} />
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
            <ProtectedRoute allowedUserTypes={['superuser']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <StudentsPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/:studentId"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <StudentDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teachers"
          element={
            <ProtectedRoute requiredUserType="superuser">
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
            <ProtectedRoute requiredUserType="superuser">
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>
                  <TeacherDetailPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payments"
          element={
            <ProtectedRoute requiredUserType="superuser">
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
            <ProtectedRoute requiredUserType="superuser">
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
            <ProtectedRoute requiredUserType="superuser">
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
            <ProtectedRoute allowedUserTypes={['superuser']}>
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
            <ProtectedRoute allowedUserTypes={['superuser']}>
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
            <ProtectedRoute allowedUserTypes={['superuser']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <ClassesPage />
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rooms"
          element={
            <ProtectedRoute allowedUserTypes={['superuser']}>
              <Layout>
                <Suspense fallback={<LoadingSpinner />}>

                  <RoomsPage />
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
            <ProtectedRoute allowedUserTypes={['superuser']}>
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
            <ProtectedRoute requiredUserType="superuser">
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
            <ProtectedRoute allowedUserTypes={['superuser']}>
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
            <ProtectedRoute allowedUserTypes={['superuser']}>
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
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>

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
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>

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
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>

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
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>

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
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>

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
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>

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
            <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>

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
    </ServiceStatusGuard>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
        <ThemedToast />
      </BrowserRouter>
    </Provider>
  );
}

function ThemedToast() {
  const { isDark } = useThemeMode();
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={isDark ? 'dark' : 'light'}
    />
  );
}

export default App;
