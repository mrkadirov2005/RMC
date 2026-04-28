// Page component for the tests screen in the crm feature.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Clock,
  CheckCircle,
  CalendarClock,
  FileQuestion,
  Loader2,
  X,
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
  const { user } = useAppSelector((state) => state.auth);
  const { available, inProgress, completed } = useAppSelector(selectAssignedTestsBuckets);
  const loading = useAppSelector(selectAssignedTestsLoading);
  const storeError = useAppSelector(selectAssignedTestsError);
  const studentTestsUi = useAppSelector(selectStudentTestsPageUi);
  const { error, tabValue } = studentTestsUi;
  const visibleTests = useAppSelector(selectStudentTestsVisibleForPageUi) as Test[];

// Runs side effects for this component.
  useEffect(() => {
    if (!user?.id) return;
    dispatch(fetchAssignedTests({ type: 'student', id: Number(user.id) }));
  }, [dispatch, user?.id]);

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

// Returns test type color.
  const getTestTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      multiple_choice: 'bg-indigo-500',
      essay: 'bg-rose-500',
      short_answer: 'bg-sky-500',
      true_false: 'bg-emerald-500',
      form_filling: 'bg-pink-500',
      reading_passage: 'bg-purple-500',
      writing: 'bg-pink-500',
      matching: 'bg-teal-500',
    };
    return colors[type] || 'bg-gray-500';
  };

// Formats test type.
  const formatTestType = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '';
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Tests</h1>
        <p className="text-muted-foreground">View and take tests assigned to you or shared publicly</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-primary">{availableTests.length}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-amber-500">{inProgressTests.length}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-green-600">{completedTests.length}</p>
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
        <Card className="mb-6">
          <TabsList className="bg-transparent h-auto p-0 w-full justify-start border-b rounded-none">
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
          <Card>
            <CardContent className="text-center py-12">
              <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {visibleTests.map((test) => (
              <Card
                key={test.test_id}
                className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white',
                        getTestTypeColor(test.test_type)
                      )}
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

                  <h3 className="text-lg font-semibold mb-1">{test.test_name}</h3>

                  {test.subject_name && (
                    <p className="text-sm text-primary mb-1">{test.subject_name}</p>
                  )}

                  {test.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {test.description.substring(0, 100)}
                      {test.description.length > 100 ? '...' : ''}
                    </p>
                  )}

                  <div className="flex gap-4 mb-3">
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
      </Tabs>
    </div>
  );
};

export default StudentTestsPage;
