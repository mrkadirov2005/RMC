// Page component for the tests screen in the crm feature.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Clock,
  CheckCircle,
  CalendarClock,
  FileQuestion,
  Loader2,
  X,
  BookOpenCheck,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { testAPI } from '../../../shared/api/api';
import {
  clearStudentTestsPageError,
  setStudentTestsPageError,
  setStudentTestsPageTabValue,
} from '../../../slices/pagesUiSlice';
import { clearAssignedTestsError, fetchAssignedTests } from '../../../slices/testsSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import {
  selectAssignedTestsBuckets,
  selectAssignedTestsError,
  selectAssignedTestsLoading,
  selectStudentTestsPageUi,
  selectStudentTestsVisibleForPageUi,
} from '../../../store/selectors';
import {
  formatTestType,
  getTestTypeBadgeClass,
  getTestTypeTheme,
  testStatCardClass,
  testSurfaceClass,
} from './testVisuals';
import { PaginationBar, defaultCardPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';

interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  description?: string;
  total_marks: number;
  duration_minutes: number;
  passing_marks: number;
  subject_name?: string;
  is_mandatory?: boolean;
  due_date?: string;
  submission_status?: string;
  is_private?: boolean;
}

// Renders the student tests page screen.
const StudentTestsPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const { user } = useAppSelector((state) => state.auth);
  const { available, inProgress, completed } = useAppSelector(selectAssignedTestsBuckets);
  const loading = useAppSelector(selectAssignedTestsLoading);
  const storeError = useAppSelector(selectAssignedTestsError);
  const studentTestsUi = useAppSelector(selectStudentTestsPageUi);
  const { error, tabValue } = studentTestsUi;
  const visibleTests = useAppSelector(selectStudentTestsVisibleForPageUi) as Test[];
  const paginatedTests = useMemo(
    () => paginateItems(visibleTests, page, pageSize),
    [visibleTests, page, pageSize]
  );

// Runs side effects for this component.
  useEffect(() => {
    if (!user?.id) return;
    dispatch(fetchAssignedTests({ type: 'student', id: Number(user.id) }));
  }, [dispatch, user?.id]);

// Runs side effects for this component.
  useEffect(() => {
    setPage(1);
  }, [tabValue]);

// Handles start test.
  const handleStartTest = async (test: Test) => {
    try {
      // Store test ID for the take test page
      localStorage.setItem(`submission_pending_test`, String(test.test_id));

      const response = await testAPI.startTest(test.test_id, user?.id || 0);
      const submissionId = response.data.submission_id;

      // Store test ID associated with submission
      localStorage.setItem(`submission_${submissionId}_test`, String(test.test_id));

      navigate(`/tests/take/${submissionId}`);
    } catch (err: any) {
      dispatch(setStudentTestsPageError(err.response?.data?.error || 'Failed to start test'));
    }
  };

  const availableTests = available as Test[];
  const inProgressTests = inProgress as Test[];
  const completedTests = completed as Test[];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_50%,#f8fafc_100%)] p-4 sm:p-6 dark:bg-none">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg border border-white/70 bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-400 p-6 text-white shadow-[0_24px_70px_-42px_rgba(14,165,233,0.95)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-96 bg-gradient-to-l from-amber-300/35 via-white/10 to-transparent dark:hidden" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/student-portal')}
              aria-label="Back to student portal"
              className="rounded-lg border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 text-white shadow-lg shadow-indigo-900/10 ring-1 ring-white/25 dark:shadow-none">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-normal text-white">My Tests</h1>
              <p className="mt-1 max-w-xl text-sm font-medium text-white/80">
                Track assigned tests, continue work in progress, and review completed results.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/student-portal')}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portal
            </Button>
          </div>
        </div>
      </div>

      {(error || storeError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex justify-between items-center">
            {error || storeError}
            <button
              onClick={() => {
                dispatch(clearStudentTestsPageError());
                dispatch(clearAssignedTestsError());
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className={cn(testStatCardClass, 'border-indigo-100 bg-gradient-to-br from-white to-indigo-50 dark:border-border dark:bg-none')}>
          <CardContent className="pt-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-muted dark:text-muted-foreground">
              <FileQuestion className="h-5 w-5" />
            </div>
            <p className="text-4xl font-bold text-indigo-700 dark:text-primary">{availableTests.length}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card className={cn(testStatCardClass, 'border-amber-100 bg-gradient-to-br from-white to-amber-50 dark:border-border dark:bg-none')}>
          <CardContent className="pt-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-muted dark:text-muted-foreground">
              <Timer className="h-5 w-5" />
            </div>
            <p className="text-4xl font-bold text-amber-600 dark:text-amber-500">{inProgressTests.length}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className={cn(testStatCardClass, 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50 dark:border-border dark:bg-none')}>
          <CardContent className="pt-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-muted dark:text-muted-foreground">
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className="text-4xl font-bold text-emerald-700 dark:text-green-500">{completedTests.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onValueChange={(value) =>
          dispatch(setStudentTestsPageTabValue(value as 'available' | 'in_progress' | 'completed'))
        }
      >
        <Card className={testSurfaceClass}>
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-gradient-to-r from-sky-50/80 via-white to-emerald-50/70 p-0 dark:bg-none">
            <TabsTrigger value="available" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              Available ({availableTests.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              In Progress ({inProgressTests.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              Completed ({completedTests.length})
            </TabsTrigger>
          </TabsList>
        </Card>

        {/* Tests Grid */}
        {visibleTests.length === 0 ? (
          <Card className={testSurfaceClass}>
            <CardContent className="py-12 text-center">
              <FileQuestion className="mx-auto mb-4 h-16 w-16 text-indigo-300 dark:text-muted-foreground" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {tabValue === 'available'
                  ? 'No tests available at the moment'
                  : tabValue === 'in_progress'
                  ? 'No tests in progress'
                  : 'No completed tests yet'}
              </h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {paginatedTests.items.map((test) => (
              <Card
                key={test.test_id}
                className={cn(
                  'h-full overflow-hidden rounded-lg border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card dark:hover:shadow-sm',
                  getTestTypeTheme(test.test_type).panel,
                  'dark:bg-none'
                )}
              >
                <div className={cn('h-1', getTestTypeTheme(test.test_type).dot)} />
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={getTestTypeBadgeClass(test.test_type)}
                    >
                      {formatTestType(test.test_type)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          test.is_private
                            ? 'border-amber-300 text-amber-700 bg-amber-50'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                        )}
                      >
                        {test.is_private ? 'Private' : 'Public'}
                      </Badge>
                      {test.is_mandatory && (
                        <Badge variant="outline" className="border-red-300 text-red-600">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  <h3 className="mb-1 text-lg font-semibold text-slate-950 dark:text-foreground">{test.test_name}</h3>

                  {test.subject_name && (
                    <p className="text-sm text-primary mb-1">{test.subject_name}</p>
                  )}

                  {test.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {test.description.substring(0, 100)}
                      {test.description.length > 100 ? '...' : ''}
                    </p>
                  )}

                  <div className="mb-3 flex gap-4 rounded-lg border border-white/70 bg-white/65 p-3 dark:border-border dark:bg-muted/20">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{test.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{test.total_marks} marks</span>
                    </div>
                  </div>

                  {test.due_date && (
                    <div className="flex items-center gap-1 mb-3">
                      <CalendarClock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-600">
                        Due: {new Date(test.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {tabValue === 'available' && (
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                      onClick={() => handleStartTest(test)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Test
                    </Button>
                  )}

                  {tabValue === 'in_progress' && (
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => {
                        navigate(`/tests/${test.test_id}`);
                      }}
                    >
                      Continue
                    </Button>
                  )}

                  {tabValue === 'completed' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/tests/${test.test_id}`)}
                    >
                      View Results
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {visibleTests.length > 0 && (
          <PaginationBar
            total={visibleTests.length}
            currentPage={paginatedTests.currentPage}
            totalPages={paginatedTests.totalPages}
            start={paginatedTests.start}
            end={paginatedTests.end}
            pageSize={pageSize}
            pageSizeOptions={defaultCardPageSizeOptions}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        )}
      </Tabs>
    </div>
  );
};

export default StudentTestsPage;
