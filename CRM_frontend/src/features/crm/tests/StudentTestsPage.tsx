import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import { testAPI } from '../../../shared/api/api';
import { useAppSelector } from '../hooks';
import type { RootState } from '../../../store';

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
}

const StudentTestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state: RootState) => state.auth);
  
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get tests assigned to the student (via their ID or class)
      const response = await testAPI.getAssignedTests('student', user?.id || 0);
      setTests(response.data || []);
    } catch (err: any) {
      console.error('Error loading tests:', err);
      // Fallback: load all active tests
      try {
        const allTestsRes = await testAPI.getAll();
        const activeTests = (allTestsRes.data || []).filter((t: Test) => t.test_id);
        setTests(activeTests);
      } catch {
        setError('Failed to load available tests');
      }
    } finally {
      setLoading(false);
    }
  };

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
      setError(err.response?.data?.error || 'Failed to start test');
    }
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

  const availableTests = tests.filter((t) => !t.submission_status || t.submission_status === 'not_started');
  const inProgressTests = tests.filter((t) => t.submission_status === 'in_progress');
  const completedTests = tests.filter((t) => t.submission_status === 'submitted' || t.submission_status === 'graded');

  const getFilteredTests = () => {
    switch (tabValue) {
      case 1:
        return inProgressTests;
      case 2:
        return completedTests;
      default:
        return availableTests;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          My Tests
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and take tests assigned to you
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="primary">
                {availableTests.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="warning.main">
                {inProgressTests.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="success.main">
                {completedTests.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Available (${availableTests.length})`} />
          <Tab label={`In Progress (${inProgressTests.length})`} />
          <Tab label={`Completed (${completedTests.length})`} />
        </Tabs>
      </Card>

      {/* Tests Grid */}
      {getFilteredTests().length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <QuizIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {tabValue === 0
                ? 'No tests available at the moment'
                : tabValue === 1
                ? 'No tests in progress'
                : 'No completed tests yet'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {getFilteredTests().map((test) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={test.test_id}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Chip
                      label={formatTestType(test.test_type)}
                      size="small"
                      sx={{
                        bgcolor: getTestTypeColor(test.test_type),
                        color: 'white',
                      }}
                    />
                    {test.is_mandatory && (
                      <Chip label="Required" size="small" color="error" variant="outlined" />
                    )}
                  </Box>

                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    {test.test_name}
                  </Typography>

                  {test.subject_name && (
                    <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                      {test.subject_name}
                    </Typography>
                  )}

                  {test.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {test.description.substring(0, 100)}
                      {test.description.length > 100 ? '...' : ''}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimerIcon fontSize="small" color="action" />
                      <Typography variant="body2">{test.duration_minutes} min</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckIcon fontSize="small" color="action" />
                      <Typography variant="body2">{test.total_marks} marks</Typography>
                    </Box>
                  </Box>

                  {test.due_date && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                      <ScheduleIcon fontSize="small" color="warning" />
                      <Typography variant="body2" color="warning.main">
                        Due: {new Date(test.due_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}

                  {tabValue === 0 && (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<StartIcon />}
                      onClick={() => handleStartTest(test)}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    >
                      Start Test
                    </Button>
                  )}

                  {tabValue === 1 && (
                    <Button
                      fullWidth
                      variant="contained"
                      color="warning"
                      onClick={() => {
                        // Resume test logic
                        navigate(`/tests/${test.test_id}`);
                      }}
                    >
                      Continue
                    </Button>
                  )}

                  {tabValue === 2 && (
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(`/tests/${test.test_id}`)}
                    >
                      View Results
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default StudentTestsPage;
