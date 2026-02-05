import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { testAPI } from '../../../shared/api/api';

interface Answer {
  answer_id: number;
  question_id: number;
  question_text: string;
  question_type: string;
  marks: number;
  options?: string[];
  correct_answer?: any;
  student_answer?: any;
  is_correct?: boolean;
  marks_awarded?: number;
  feedback?: string;
  explanation?: string;
}

interface Submission {
  submission_id: number;
  test_id: number;
  test_name: string;
  test_type: string;
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number?: string;
  status: string;
  score?: number;
  total_marks: number;
  passing_marks: number;
  started_at?: string;
  submitted_at?: string;
  graded_at?: string;
  graded_by?: number;
  attempt_number?: number;
  answers: Answer[];
}

const ViewSubmissionPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const response = await testAPI.getSubmissionDetails(Number(submissionId));
      setSubmission(response.data);
    } catch (err: any) {
      console.error('Error loading submission:', err);
      setError('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const formatAnswer = (answer: Answer) => {
    const studentAnswer = answer.student_answer;
    if (!studentAnswer) return <em className="text-gray-400">No answer provided</em>;

    switch (answer.question_type) {
      case 'multiple_choice':
        if (studentAnswer.index !== undefined && answer.options) {
          return answer.options[studentAnswer.index] || 'Invalid selection';
        }
        return JSON.stringify(studentAnswer);
      case 'true_false':
        return studentAnswer.value ? 'True' : 'False';
      case 'short_answer':
      case 'essay':
      case 'writing':
      case 'form_filling':
        return studentAnswer.text || '';
      case 'matching':
        if (studentAnswer.matches) {
          return Object.entries(studentAnswer.matches).map(([key, val]) => (
            <div key={key}>Match {Number(key) + 1}: {String(val)}</div>
          ));
        }
        return JSON.stringify(studentAnswer);
      default:
        return JSON.stringify(studentAnswer);
    }
  };

  const formatCorrectAnswer = (answer: Answer) => {
    const correct = answer.correct_answer;
    if (!correct) return <em>Not specified</em>;

    switch (answer.question_type) {
      case 'multiple_choice':
        if (correct.index !== undefined && answer.options) {
          return answer.options[correct.index] || 'Invalid';
        }
        if (correct.indexes && answer.options) {
          return correct.indexes.map((i: number) => answer.options![i]).join(', ');
        }
        return JSON.stringify(correct);
      case 'true_false':
        return correct.value ? 'True' : 'False';
      case 'short_answer':
        return correct.text || correct.keywords?.join(', ') || JSON.stringify(correct);
      default:
        return JSON.stringify(correct);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'warning';
      case 'graded': return 'success';
      case 'in_progress': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!submission) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Submission not found</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  const isPassing = (submission.score || 0) >= (submission.passing_marks || 0);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate(`/tests/${submission.test_id}`)}>
          Back
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Submission Details
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {submission.test_name}
          </Typography>
        </Box>
        {submission.status === 'submitted' && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/tests/submissions/${submissionId}/grade`)}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            Grade Submission
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Student & Score Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Student
              </Typography>
              <Typography variant="h6">
                {submission.first_name} {submission.last_name}
              </Typography>
              {submission.enrollment_number && (
                <Typography variant="body2" color="text.secondary">
                  {submission.enrollment_number}
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography 
                  variant="h4" 
                  fontWeight={700} 
                  color={submission.status === 'graded' ? (isPassing ? 'success.main' : 'error.main') : 'text.primary'}
                >
                  {submission.score ?? '-'}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  / {submission.total_marks}
                </Typography>
              </Box>
              {submission.status === 'graded' && (
                <Chip
                  label={isPassing ? 'Passed' : 'Failed'}
                  color={isPassing ? 'success' : 'error'}
                  size="small"
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Status
              </Typography>
              <Chip 
                label={submission.status.replace(/_/g, ' ')} 
                color={getStatusColor(submission.status) as any}
              />
              {submission.attempt_number && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Attempt #{submission.attempt_number}
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Timestamps
              </Typography>
              <Typography variant="body2">
                Started: {submission.started_at ? new Date(submission.started_at).toLocaleString() : 'N/A'}
              </Typography>
              <Typography variant="body2">
                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
              </Typography>
              {submission.graded_at && (
                <Typography variant="body2">
                  Graded: {new Date(submission.graded_at).toLocaleString()}
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Answers Summary Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Answers Summary
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Question</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="center">Correct</TableCell>
                  <TableCell align="right">Marks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submission.answers?.map((answer, index) => (
                  <TableRow key={answer.question_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {answer.question_text}
                    </TableCell>
                    <TableCell>
                      <Chip label={answer.question_type?.replace(/_/g, ' ')} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      {answer.is_correct === true ? (
                        <CheckIcon color="success" />
                      ) : answer.is_correct === false ? (
                        <CloseIcon color="error" />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>
                        {answer.marks_awarded ?? '-'} / {answer.marks}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Detailed Answers */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Detailed Answers
      </Typography>
      
      {submission.answers?.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No answers recorded</Typography>
          </CardContent>
        </Card>
      ) : (
        submission.answers?.map((answer, index) => (
          <Card key={answer.question_id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Question {index + 1}
                    </Typography>
                    <Chip label={answer.question_type?.replace(/_/g, ' ')} size="small" variant="outlined" />
                    {answer.is_correct === true && <Chip label="Correct" color="success" size="small" />}
                    {answer.is_correct === false && <Chip label="Incorrect" color="error" size="small" />}
                  </Box>
                  <Typography variant="h6">
                    {answer.question_text}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h5" fontWeight={700} color={answer.marks_awarded === answer.marks ? 'success.main' : 'text.primary'}>
                    {answer.marks_awarded ?? '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    / {answer.marks} marks
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Student's Answer
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: 60 }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {formatAnswer(answer)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Correct Answer
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#e8f5e9', minHeight: 60 }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {formatCorrectAnswer(answer)}
                    </Typography>
                  </Paper>
                </Grid>

                {answer.feedback && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Feedback
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                      <Typography variant="body1">{answer.feedback}</Typography>
                    </Paper>
                  </Grid>
                )}

                {answer.explanation && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Explanation
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {answer.explanation}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default ViewSubmissionPage;
