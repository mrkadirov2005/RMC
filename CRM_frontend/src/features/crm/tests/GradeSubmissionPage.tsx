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
  TextField,
  Grid,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { testAPI } from '../../../shared/api/api';
import { toast } from 'react-toastify';

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
  answers: Answer[];
}

const GradeSubmissionPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [grades, setGrades] = useState<{ [key: number]: { marks: number; feedback: string } }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const response = await testAPI.getSubmissionDetails(Number(submissionId));
      setSubmission(response.data);
      
      // Initialize grades from existing data
      const initialGrades: { [key: number]: { marks: number; feedback: string } } = {};
      response.data.answers?.forEach((answer: Answer) => {
        initialGrades[answer.question_id] = {
          marks: answer.marks_awarded ?? (answer.is_correct ? answer.marks : 0),
          feedback: answer.feedback || '',
        };
      });
      setGrades(initialGrades);
    } catch (err: any) {
      console.error('Error loading submission:', err);
      setError('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (questionId: number, field: 'marks' | 'feedback', value: any) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }));
  };

  const handleQuickGrade = (questionId: number, marks: number, _maxMarks: number) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        marks: marks === prev[questionId]?.marks ? 0 : marks,
      },
    }));
  };

  const calculateTotalScore = () => {
    return Object.values(grades).reduce((sum, g) => sum + (Number(g.marks) || 0), 0);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const answerGrades = Object.entries(grades).map(([questionId, grade]) => ({
        question_id: Number(questionId),
        marks_obtained: Number(grade.marks) || 0,
        feedback: grade.feedback || '',
      }));

      // Get current user info
      const authData = localStorage.getItem('crm_auth');
      const authUser = authData ? JSON.parse(authData).user : null;

      await testAPI.gradeSubmission(Number(submissionId), {
        answer_grades: answerGrades,
        graded_by: authUser?.id,
        graded_by_type: authUser?.userType || 'superuser',
      });

      toast.success('Submission graded successfully!');
      navigate(`/tests/${submission?.test_id}`);
    } catch (err: any) {
      console.error('Error saving grades:', err);
      setError(err.response?.data?.error || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const formatAnswer = (answer: Answer) => {
    const studentAnswer = answer.student_answer;
    if (!studentAnswer) return <em>No answer provided</em>;

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

  const totalScore = calculateTotalScore();
  const isPassing = totalScore >= (submission.passing_marks || 0);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate(`/tests/${submission.test_id}`)}>
          Back
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Grade Submission
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {submission.test_name} - {submission.first_name} {submission.last_name}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          {saving ? 'Saving...' : 'Save Grades'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Score Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="h6" gutterBottom>
                Student
              </Typography>
              <Typography variant="body1">
                {submission.first_name} {submission.last_name}
              </Typography>
              {submission.enrollment_number && (
                <Typography variant="body2" color="text.secondary">
                  {submission.enrollment_number}
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="h6" gutterBottom>
                Current Score
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h3" fontWeight={700} color={isPassing ? 'success.main' : 'error.main'}>
                  {totalScore}
                </Typography>
                <Typography variant="h5" color="text.secondary">
                  / {submission.total_marks}
                </Typography>
              </Box>
              <Chip
                label={isPassing ? 'Passing' : 'Failing'}
                color={isPassing ? 'success' : 'error'}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="h6" gutterBottom>
                Submission Info
              </Typography>
              <Typography variant="body2">
                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
              </Typography>
              <Typography variant="body2">
                Status: <Chip label={submission.status} size="small" />
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Questions and Grading */}
      {submission.answers?.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No answers to grade</Typography>
          </CardContent>
        </Card>
      ) : (
        submission.answers?.map((answer, index) => (
          <Card key={answer.question_id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Question {index + 1} • {answer.question_type?.replace(/_/g, ' ')}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {answer.question_text}
                  </Typography>
                </Box>
                <Chip label={`${answer.marks} marks`} variant="outlined" />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={3}>
                {/* Student Answer */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Student's Answer
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: 80 }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {formatAnswer(answer)}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Correct Answer */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Correct Answer
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#e8f5e9', minHeight: 80 }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {formatCorrectAnswer(answer)}
                    </Typography>
                  </Paper>
                  {answer.explanation && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      <strong>Explanation:</strong> {answer.explanation}
                    </Typography>
                  )}
                </Grid>

                {/* Grading Section */}
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Quick Grade Buttons */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Quick Grade
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant={grades[answer.question_id]?.marks === 0 ? 'contained' : 'outlined'}
                          color="error"
                          startIcon={<CloseIcon />}
                          onClick={() => handleQuickGrade(answer.question_id, 0, answer.marks)}
                        >
                          0
                        </Button>
                        {answer.marks > 1 && (
                          <Button
                            size="small"
                            variant={grades[answer.question_id]?.marks === Math.floor(answer.marks / 2) ? 'contained' : 'outlined'}
                            color="warning"
                            onClick={() => handleQuickGrade(answer.question_id, Math.floor(answer.marks / 2), answer.marks)}
                          >
                            {Math.floor(answer.marks / 2)}
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant={grades[answer.question_id]?.marks === answer.marks ? 'contained' : 'outlined'}
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => handleQuickGrade(answer.question_id, answer.marks, answer.marks)}
                        >
                          {answer.marks}
                        </Button>
                      </Box>
                    </Box>

                    {/* Manual Marks */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Marks Awarded
                      </Typography>
                      <TextField
                        type="number"
                        size="small"
                        value={grades[answer.question_id]?.marks ?? 0}
                        onChange={(e) => handleGradeChange(answer.question_id, 'marks', Math.min(Number(e.target.value), answer.marks))}
                        inputProps={{ min: 0, max: answer.marks, step: 0.5 }}
                        sx={{ width: 100 }}
                      />
                    </Box>

                    {/* Feedback */}
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Feedback (optional)
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Add feedback for this answer..."
                        value={grades[answer.question_id]?.feedback || ''}
                        onChange={(e) => handleGradeChange(answer.question_id, 'feedback', e.target.value)}
                        multiline
                        rows={2}
                      />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))
      )}

      {/* Floating Save Button */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: 4,
          }}
        >
          Save Grades ({totalScore}/{submission.total_marks})
        </Button>
      </Box>
    </Box>
  );
};

export default GradeSubmissionPage;
