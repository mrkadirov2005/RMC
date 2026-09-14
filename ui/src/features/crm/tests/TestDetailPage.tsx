// Page component for the tests screen in the crm feature.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Play,
  Clock,
  CheckCircle,
  BarChart3,
  ClipboardList,
  Loader2,
  X,
  FileQuestion,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/utils/errorMessage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { testAPI } from './api';
import { ShareTestPanel } from './components/ShareTestPanel';
import { useAppSelector } from '../hooks';
import {
  formatTestType,
  getTestTypeBadgeClass,
} from './testVisuals';

// Renders the test detail page screen.
const TestDetailPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const [test, setTest] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState('overview');
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [resultsStats, setResultsStats] = useState<any>(null);

// Runs side effects for this component.
  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

// Loads test.
  const loadTest = async () => {
    try {
      setLoading(true);
      setError(null);

      const [testRes, submissionsRes, resultsRes] = await Promise.all([
        testAPI.getById(Number(testId)),
        testAPI.getSubmissionsByTest(Number(testId)),
        testAPI.getTestResults(Number(testId)),
      ]);

      setTest(testRes.data);
      setSubmissions(submissionsRes.data || []);
      setResultsStats(resultsRes.data);
    } catch (err: any) {
      console.error('Error loading test:', err);
      setError('Failed to load test details');
    } finally {
      setLoading(false);
    }
  };

// Handles start test.
  const handleStartTest = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }
    try {
      const response = await testAPI.startTest(Number(testId), user.id, user.userType);
      const submissionId = response.data.submission_id;
      localStorage.setItem(`submission_${submissionId}_test`, String(testId));
      navigate(`/tests/take/${submissionId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start test');
    }
    setStartDialogOpen(false);
  };

// Returns status color.
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Test not found</AlertDescription>
        </Alert>
        <Button
          variant="ghost"
          onClick={() => navigate(user?.userType === 'student' ? '/my-tests' : '/tests')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tests
        </Button>
      </div>
    );
  }

  const isTeacherOrAdmin = user?.userType === 'superuser' || user?.userType === 'teacher';
  const canTakeTest = test.is_active && user?.userType === 'student';

  return (
    <div className="space-y-6 p-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => navigate(user?.userType === 'student' ? '/my-tests' : '/tests')}
      >
        <ArrowLeft className="h-4 w-4" />
        {user?.userType === 'student' ? 'Back to my tests' : 'Back to Tests'}
      </Button>

      <PageHeader
        title={test.test_name}
        icon={ClipboardList}
        description={test.subject_name || undefined}
        meta={
          <>
            <span className={getTestTypeBadgeClass(test.test_type)}>{formatTestType(test.test_type)}</span>
            <Badge variant="outline">{test.is_private ? 'Private' : 'Public'}</Badge>
            <Badge variant={test.is_active ? 'default' : 'secondary'}>{test.is_active ? 'Active' : 'Inactive'}</Badge>
          </>
        }
        actions={
          isTeacherOrAdmin ? (
            <>
              <Button variant="outline" onClick={() => navigate(`/tests/${testId}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => navigate(`/tests/${testId}/assign`)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Assign
              </Button>
            </>
          ) : undefined
        }
        primaryAction={
          canTakeTest ? (
            <Button onClick={() => setStartDialogOpen(true)}>
              <Play className="mr-2 h-4 w-4" />
              Take test
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex justify-between items-center">
            {getErrorMessage(error)}
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        {[
          { label: 'Minutes', value: test.duration_minutes, icon: Clock },
          { label: 'Total marks', value: test.total_marks, icon: CheckCircle },
          { label: 'Passing marks', value: test.passing_marks, icon: BarChart3 },
          { label: 'Questions', value: test.questions?.length || 0, icon: FileQuestion },
        ].map((tile) => (
          <div key={tile.label} className="bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tile.icon className="h-3.5 w-3.5" />
              {tile.label}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <div className="border-b">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                Overview
              </TabsTrigger>
              {isTeacherOrAdmin && (
                <TabsTrigger value="questions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                  Questions
                </TabsTrigger>
              )}
              {isTeacherOrAdmin && (
                <TabsTrigger value="submissions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                  Submissions ({submissions.length})
                </TabsTrigger>
              )}
              {isTeacherOrAdmin && (
                <TabsTrigger value="statistics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                  Statistics
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  {test.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground">{test.description}</p>
                    </div>
                  )}
                  {test.instructions && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Instructions</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{test.instructions}</p>
                    </div>
                  )}

                  {/* Reading Passages Preview */}
                  {test.passages && test.passages.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Reading Passages ({test.passages.length})
                      </h3>
                      {test.passages.map((passage: any, index: number) => (
                        <div key={passage.passage_id} className="mb-2 rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-border dark:bg-muted/20">
                          <p className="font-semibold">
                            {index + 1}. {passage.title}
                          </p>
                          <Badge variant="secondary" className="mt-1">{passage.difficulty_level}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-border dark:bg-muted/20">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                      <Settings className="h-5 w-5 text-indigo-600 dark:text-primary" />
                      Test Settings
                    </h3>
                    <div className="flex flex-col gap-2 text-sm">
                      <p><strong>Timed:</strong> {test.is_timed ? 'Yes' : 'No'}</p>
                      <p><strong>Shuffle Questions:</strong> {test.shuffle_questions ? 'Yes' : 'No'}</p>
                      <p><strong>Show Results:</strong> {test.show_results_immediately ? 'Immediately' : 'After grading'}</p>
                      <p><strong>Retakes:</strong> {test.allow_retake ? `Yes (max ${test.max_retakes})` : 'No'}</p>
                      <p><strong>Assignment:</strong> {test.assignment_type?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </TabsContent>

          {/* Questions Tab */}
          {isTeacherOrAdmin && (
            <TabsContent value="questions">
              <CardContent className="pt-6">
                {test.questions && test.questions.length > 0 ? (
                  test.questions.map((question: any, index: number) => (
                    <div key={question.question_id} className="mb-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/20">
                      <div className="flex justify-between mb-2">
                        <p className="font-semibold">
                          Q{index + 1}. {question.question_text}
                        </p>
                        <Badge variant="outline">{question.marks} marks</Badge>
                      </div>
                      <Badge variant="secondary">{formatTestType(question.question_type)}</Badge>
                      {question.options && (
                        <div className="mt-3 pl-4">
                          {question.options.map((opt: string, i: number) => (
                            <p
                              key={i}
                              className={cn(
                                'text-sm',
                                question.correct_answer?.index === i
                                  ? 'text-green-600 font-medium'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {String.fromCharCode(65 + i)}. {opt} {question.correct_answer?.index === i && '✓'}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <Alert>
                    <AlertDescription>No questions added yet</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </TabsContent>
          )}

          {/* Submissions Tab */}
          {isTeacherOrAdmin && (
            <TabsContent value="submissions">
              <CardContent className="pt-6">
                {submissions.length === 0 ? (
                  <Alert>
                    <AlertDescription>No submissions yet</AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Time Taken</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((sub) => (
                          <TableRow key={sub.submission_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                  {sub.first_name?.[0]}{sub.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {sub.first_name} {sub.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {sub.enrollment_number}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(sub.status))}>
                                {sub.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {sub.obtained_marks !== null ? (
                                <div>
                                  <p className="text-sm font-medium">
                                    {sub.obtained_marks}/{test.total_marks}
                                  </p>
                                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                                    <div
                                      className={cn(
                                        'h-1 rounded-full',
                                        sub.is_passed ? 'bg-green-500' : 'bg-red-500'
                                      )}
                                      style={{ width: `${sub.percentage || 0}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {sub.submitted_at
                                ? new Date(sub.submitted_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {sub.time_taken_seconds
                                ? `${Math.floor(sub.time_taken_seconds / 60)}m ${sub.time_taken_seconds % 60}s`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => navigate(`/tests/submissions/${sub.submission_id}`)}
                                >
                                  View
                                </Button>
                                {sub.status !== 'graded' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/tests/submissions/${sub.submission_id}/grade`)}
                                  >
                                    Grade
                                  </Button>
                                )}
                                {sub.status === 'graded' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-green-600"
                                    onClick={() => navigate(`/tests/submissions/${sub.submission_id}/grade`)}
                                  >
                                    Re-Grade
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          )}

          {/* Statistics Tab */}
          {isTeacherOrAdmin && (
            <TabsContent value="statistics">
              <CardContent className="pt-6">
                {resultsStats?.statistics ? (
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
                    {[
                      { label: 'Submissions', value: resultsStats.statistics.total_submissions || 0 },
                      { label: 'Passed', value: resultsStats.statistics.passed_count || 0 },
                      {
                        label: 'Average score',
                        value: `${parseFloat(resultsStats.statistics.average_percentage || 0).toFixed(1)}%`,
                      },
                    ].map((tile) => (
                      <div key={tile.label} className="bg-card p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {tile.label}
                        </p>
                        <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{tile.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>No statistics available yet</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </TabsContent>
          )}
        </Tabs>
      </Card>

      {isTeacherOrAdmin && (
        <div className="mt-6">
          <ShareTestPanel
            testId={Number(testId)}
            shareToken={test.share_token ?? null}
            onTokenChange={(token) => setTest((current: any) => ({ ...current, share_token: token }))}
          />
        </div>
      )}

      {/* Start Test Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Test</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              You are about to start "{test.test_name}".
            </p>
            <div className="space-y-1 text-sm">
              <p>• Duration: {test.duration_minutes} minutes</p>
              <p>• Questions: {test.questions?.length || 0}</p>
              <p>• Total Marks: {test.total_marks}</p>
            </div>
            {test.is_timed && (
              <Alert className="mt-4 border-yellow-300 bg-yellow-50">
                <AlertDescription className="text-yellow-800">
                  This is a timed test. Once you start, the timer will begin.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartTest}
            >
              Start Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestDetailPage;
