import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  PlayArrow as StartIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  People as PeopleIcon,
  Assessment as ResultsIcon,
  Assignment as AssignIcon,
} from '@mui/icons-material';
import { testAPI } from '../../../shared/api/api';
import { useAppSelector } from '../hooks';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const TestDetailPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [test, setTest] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [resultsStats, setResultsStats] = useState<any>(null);

  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

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

  const handleStartTest = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }
    try {
      const response = await testAPI.startTest(Number(testId), user.id, user.userType);
      const submissionId = response.data.submission_id;
      // Save test ID for the TakeTestPage
      localStorage.setItem(`submission_${submissionId}_test`, String(testId));
      navigate(`/tests/take/${submissionId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start test');
    }
    setStartDialogOpen(false);
  };

  const getTestTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      multiple_choice: '#667eea',
      essay: '#f5576c',
      short_answer: '#4facfe',
      true_false: '#43e97b',
      form_filling: '#fa709a',
      reading_passage: '#a855f7',
      writing: '#ec4899',
      matching: '#14b8a6',
    };
    return colors[type] || '#6b7280';
  };

  const formatTestType = (type: string) => {
    return type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'success';
      case 'submitted':
        return 'info';
      case 'in_progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!test) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Test not found</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/tests')} sx={{ mt: 2 }}>
          Back to Tests
        </Button>
      </Box>
    );
  }

  const isTeacherOrAdmin = user?.userType === 'superuser' || user?.userType === 'teacher';
  const canTakeTest = test.is_active; // Allow anyone to take active tests (superuser, teacher, student)

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/tests')}>
          <BackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {test.test_name}
            </Typography>
            <Chip
              label={formatTestType(test.test_type)}
              sx={{
                bgcolor: getTestTypeColor(test.test_type),
                color: 'white',
              }}
            />
            <Chip
              label={test.is_active ? 'Active' : 'Inactive'}
              color={test.is_active ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
          {test.subject_name && (
            <Typography variant="subtitle1" color="primary">
              {test.subject_name}
            </Typography>
          )}
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canTakeTest && (
            <Button
              variant="contained"
              startIcon={<StartIcon />}
              onClick={() => setStartDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Take Test
            </Button>
          )}
          {isTeacherOrAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/tests/${testId}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssignIcon />}
                onClick={() => navigate(`/tests/${testId}/assign`)}
              >
                Assign
              </Button>
            </>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Test Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TimerIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>
                {test.duration_minutes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Minutes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>
                {test.total_marks}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Marks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ResultsIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>
                {test.passing_marks}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Passing Marks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight={700}>
                {test.questions?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Questions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Overview" />
            {isTeacherOrAdmin && <Tab label="Questions" />}
            {isTeacherOrAdmin && <Tab label={`Submissions (${submissions.length})`} />}
            {isTeacherOrAdmin && <Tab label="Statistics" />}
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                {test.description && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Description
                    </Typography>
                    <Typography color="text.secondary">
                      {test.description}
                    </Typography>
                  </Box>
                )}
                {test.instructions && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Instructions
                    </Typography>
                    <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {test.instructions}
                    </Typography>
                  </Box>
                )}
                
                {/* Reading Passages Preview */}
                {test.passages && test.passages.length > 0 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Reading Passages ({test.passages.length})
                    </Typography>
                    {test.passages.map((passage: any, index: number) => (
                      <Paper key={passage.passage_id} sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {index + 1}. {passage.title}
                        </Typography>
                        <Chip label={passage.difficulty_level} size="small" sx={{ mt: 1 }} />
                      </Paper>
                    ))}
                  </Box>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                  <Typography variant="h6" gutterBottom>
                    Test Settings
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>Timed:</strong> {test.is_timed ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Shuffle Questions:</strong> {test.shuffle_questions ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Show Results:</strong> {test.show_results_immediately ? 'Immediately' : 'After grading'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Retakes:</strong> {test.allow_retake ? `Yes (max ${test.max_retakes})` : 'No'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Assignment:</strong> {test.assignment_type?.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Questions Tab */}
        {isTeacherOrAdmin && (
          <TabPanel value={tabValue} index={1}>
            <CardContent>
              {test.questions && test.questions.length > 0 ? (
                test.questions.map((question: any, index: number) => (
                  <Paper key={question.question_id} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Q{index + 1}. {question.question_text}
                      </Typography>
                      <Chip label={`${question.marks} marks`} size="small" />
                    </Box>
                    <Chip label={formatTestType(question.question_type)} size="small" variant="outlined" />
                    {question.options && (
                      <Box sx={{ mt: 2, pl: 2 }}>
                        {question.options.map((opt: string, i: number) => (
                          <Typography key={i} variant="body2" color={question.correct_answer?.index === i ? 'success.main' : 'text.secondary'}>
                            {String.fromCharCode(65 + i)}. {opt} {question.correct_answer?.index === i && '✓'}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                ))
              ) : (
                <Alert severity="info">No questions added yet</Alert>
              )}
            </CardContent>
          </TabPanel>
        )}

        {/* Submissions Tab */}
        {isTeacherOrAdmin && (
          <TabPanel value={tabValue} index={2}>
            <CardContent>
              {submissions.length === 0 ? (
                <Alert severity="info">No submissions yet</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Submitted</TableCell>
                        <TableCell>Time Taken</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {submissions.map((sub) => (
                        <TableRow key={sub.submission_id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                                {sub.first_name?.[0]}{sub.last_name?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {sub.first_name} {sub.last_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {sub.enrollment_number}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={sub.status}
                              size="small"
                              color={getStatusColor(sub.status) as any}
                            />
                          </TableCell>
                          <TableCell>
                            {sub.obtained_marks !== null ? (
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {sub.obtained_marks}/{test.total_marks}
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={sub.percentage || 0}
                                  sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                  color={sub.is_passed ? 'success' : 'error'}
                                />
                              </Box>
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
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => navigate(`/tests/submissions/${sub.submission_id}`)}
                            >
                              View
                            </Button>
                            {sub.status !== 'graded' && (
                              <Button
                                size="small"
                                color="primary"
                                onClick={() => navigate(`/tests/submissions/${sub.submission_id}/grade`)}
                              >
                                Grade
                              </Button>
                            )}
                            {sub.status === 'graded' && (
                              <Button
                                size="small"
                                color="success"
                                onClick={() => navigate(`/tests/submissions/${sub.submission_id}/grade`)}
                              >
                                Re-Grade
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </TabPanel>
        )}

        {/* Statistics Tab */}
        {isTeacherOrAdmin && (
          <TabPanel value={tabValue} index={3}>
            <CardContent>
              {resultsStats?.statistics ? (
                <Grid container spacing={3}>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight={700}>
                        {resultsStats.statistics.total_submissions || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Submissions
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {resultsStats.statistics.passed_count || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Passed
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight={700} color="primary">
                        {parseFloat(resultsStats.statistics.average_percentage || 0).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Score
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">No statistics available yet</Alert>
              )}
            </CardContent>
          </TabPanel>
        )}
      </Card>

      {/* Start Test Dialog */}
      <Dialog open={startDialogOpen} onClose={() => setStartDialogOpen(false)}>
        <DialogTitle>Start Test</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            You are about to start "{test.test_name}".
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              • Duration: {test.duration_minutes} minutes
            </Typography>
            <Typography variant="body2">
              • Questions: {test.questions?.length || 0}
            </Typography>
            <Typography variant="body2">
              • Total Marks: {test.total_marks}
            </Typography>
          </Box>
          {test.is_timed && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This is a timed test. Once you start, the timer will begin.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStartTest}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            Start Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestDetailPage;
