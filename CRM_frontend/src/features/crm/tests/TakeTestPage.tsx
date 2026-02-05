import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Paper,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Send as SubmitIcon,
  Timer as TimerIcon,
  Flag as FlagIcon,
  FlagOutlined as FlagOutlinedIcon,
} from '@mui/icons-material';
import { testAPI } from '../../../shared/api/api';

const TakeTestPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: any }>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [timeUpDialogOpen, setTimeUpDialogOpen] = useState(false);

  useEffect(() => {
    if (submissionId) {
      loadSubmission();
    }
  }, [submissionId]);

  // Timer effect
  useEffect(() => {
    if (!test?.is_timed || timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setTimeUpDialogOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [test?.is_timed, timeRemaining]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      
      // First try to get test ID from localStorage, then from submission details
      let testId = localStorage.getItem(`submission_${submissionId}_test`);
      
      if (!testId) {
        // Fetch submission details to get test_id
        try {
          const submissionRes = await testAPI.getSubmissionDetails(Number(submissionId));
          testId = String(submissionRes.data.test_id);
        } catch (subErr) {
          console.error('Could not fetch submission details:', subErr);
          throw new Error('Test information not found. Please go back and start the test again.');
        }
      }
      
      const testRes = await testAPI.getById(Number(testId));
      setTest(testRes.data);
      
      const testQuestions = testRes.data.questions || [];
      // Shuffle questions if enabled
      if (testRes.data.shuffle_questions) {
        testQuestions.sort(() => Math.random() - 0.5);
      }
      setQuestions(testQuestions);
      
      if (testQuestions.length === 0) {
        setError('This test has no questions. Please contact the administrator.');
      }
      
      // Calculate remaining time
      if (testRes.data.is_timed) {
        setTimeRemaining(testRes.data.duration_minutes * 60);
      }
    } catch (err: any) {
      console.error('Error loading submission:', err);
      setError(err.message || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = useCallback((questionId: number, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const toggleFlag = (questionId: number) => {
    setFlagged((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (force: boolean = false) => {
    if (!force) {
      setConfirmDialogOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      setConfirmDialogOpen(false);
      setTimeUpDialogOpen(false);

      // Format answers as object with question_id as keys (backend expects this format)
      const formattedAnswers: { [key: number]: any } = {};
      questions.forEach((q) => {
        formattedAnswers[q.question_id] = answers[q.question_id] || null;
      });

      await testAPI.submitTest(Number(submissionId), formattedAnswers);
      
      // Navigate to results or confirmation
      navigate('/tests', { 
        state: { message: 'Test submitted successfully!' } 
      });
    } catch (err: any) {
      console.error('Error submitting test:', err);
      setError(err.response?.data?.error || 'Failed to submit test');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining === null) return 'primary';
    if (timeRemaining < 60) return 'error';
    if (timeRemaining < 300) return 'warning';
    return 'primary';
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !test) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/tests')} sx={{ mt: 2 }}>
          Back to Tests
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3, position: 'sticky', top: 0, zIndex: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {test?.test_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Question {currentIndex + 1} of {questions.length}
            </Typography>
          </Box>
          
          {test?.is_timed && timeRemaining !== null && (
            <Chip
              icon={<TimerIcon />}
              label={formatTime(timeRemaining)}
              color={getTimeColor()}
              variant={timeRemaining < 60 ? 'filled' : 'outlined'}
              sx={{ fontSize: '1.2rem', py: 2, px: 1 }}
            />
          )}
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {answeredCount}/{questions.length} answered
            </Typography>
            <Typography variant="body2" color="warning.main">
              {flagged.size} flagged
            </Typography>
          </Box>
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 6, borderRadius: 3 }} />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Question Navigator */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Question Navigator
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {questions.map((q, index) => (
            <Button
              key={q.question_id}
              size="small"
              variant={index === currentIndex ? 'contained' : 'outlined'}
              onClick={() => setCurrentIndex(index)}
              sx={{
                minWidth: 40,
                height: 40,
                bgcolor: index === currentIndex ? 'primary.main' :
                  flagged.has(q.question_id) ? 'warning.light' :
                  answers[q.question_id] ? 'success.light' : undefined,
                color: index === currentIndex ? 'white' :
                  flagged.has(q.question_id) || answers[q.question_id] ? 'text.primary' : undefined,
              }}
            >
              {index + 1}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* Current Question */}
      {currentQuestion && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Chip label={`${currentQuestion.marks} marks`} size="small" />
                  <Chip
                    label={currentQuestion.question_type?.replace(/_/g, ' ')}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="h6">
                  {currentQuestion.question_text}
                </Typography>
              </Box>
              <IconButton
                onClick={() => toggleFlag(currentQuestion.question_id)}
                color={flagged.has(currentQuestion.question_id) ? 'warning' : 'default'}
              >
                {flagged.has(currentQuestion.question_id) ? <FlagIcon /> : <FlagOutlinedIcon />}
              </IconButton>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Answer Input based on question type */}
            {currentQuestion.question_type === 'multiple_choice' && (
              <RadioGroup
                value={answers[currentQuestion.question_id]?.index ?? ''}
                onChange={(e) => handleAnswerChange(currentQuestion.question_id, { index: parseInt(e.target.value) })}
              >
                {currentQuestion.options?.map((option: string, index: number) => (
                  <FormControlLabel
                    key={index}
                    value={index}
                    control={<Radio />}
                    label={`${String.fromCharCode(65 + index)}. ${option}`}
                    sx={{
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: answers[currentQuestion.question_id]?.index === index ? 'primary.lighter' : undefined,
                    }}
                  />
                ))}
              </RadioGroup>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.question_id]?.value ?? ''}
                onChange={(e) => handleAnswerChange(currentQuestion.question_id, { value: e.target.value === 'true' })}
              >
                <FormControlLabel value="true" control={<Radio />} label="True" sx={{ mb: 1 }} />
                <FormControlLabel value="false" control={<Radio />} label="False" />
              </RadioGroup>
            )}

            {(currentQuestion.question_type === 'short_answer' ||
              currentQuestion.question_type === 'form_filling') && (
              <TextField
                fullWidth
                placeholder="Type your answer here..."
                value={answers[currentQuestion.question_id]?.text || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.question_id, { text: e.target.value })}
                multiline={currentQuestion.question_type === 'form_filling'}
                rows={currentQuestion.question_type === 'form_filling' ? 3 : 1}
              />
            )}

            {(currentQuestion.question_type === 'essay' ||
              currentQuestion.question_type === 'writing') && (
              <TextField
                fullWidth
                placeholder="Write your answer here..."
                value={answers[currentQuestion.question_id]?.text || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.question_id, { text: e.target.value })}
                multiline
                rows={10}
                helperText={`${(answers[currentQuestion.question_id]?.text || '').length} characters`}
              />
            )}

            {currentQuestion.question_type === 'matching' && currentQuestion.matching_pairs && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Match the items on the left with the correct items on the right
                </Typography>
                {currentQuestion.matching_pairs.map((pair: any, index: number) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Paper sx={{ p: 1.5, flex: 1, bgcolor: '#f5f5f5' }}>
                      <Typography>{pair.left}</Typography>
                    </Paper>
                    <TextField
                      select
                      SelectProps={{ native: true }}
                      value={answers[currentQuestion.question_id]?.matches?.[index] ?? ''}
                      onChange={(e) => {
                        const currentMatches = answers[currentQuestion.question_id]?.matches || {};
                        handleAnswerChange(currentQuestion.question_id, {
                          matches: { ...currentMatches, [index]: e.target.value },
                        });
                      }}
                      sx={{ minWidth: 200 }}
                    >
                      <option value="">Select match...</option>
                      {currentQuestion.matching_pairs.map((p: any, i: number) => (
                        <option key={i} value={p.right}>
                          {p.right}
                        </option>
                      ))}
                    </TextField>
                  </Box>
                ))}
              </Box>
            )}

            {/* Reading Passage */}
            {currentQuestion.question_type === 'reading_passage' && currentQuestion.passage && (
              <Box sx={{ mb: 3 }}>
                <Paper sx={{ p: 2, bgcolor: '#f9f9f9', maxHeight: 300, overflow: 'auto', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {currentQuestion.passage.title}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {currentQuestion.passage.content}
                  </Typography>
                </Paper>
                <TextField
                  fullWidth
                  placeholder="Answer based on the reading passage..."
                  value={answers[currentQuestion.question_id]?.text || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.question_id, { text: e.target.value })}
                  multiline
                  rows={4}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Always show Submit button */}
          <Button
            variant="contained"
            color="success"
            endIcon={<SubmitIcon />}
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            Submit Test
          </Button>
          
          {currentIndex < questions.length - 1 && (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Next
            </Button>
          )}
        </Box>
      </Box>

      {/* Confirm Submit Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Submit Test?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to submit your test?
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              • Answered: {answeredCount} of {questions.length} questions
            </Typography>
            <Typography variant="body2">
              • Unanswered: {questions.length - answeredCount}
            </Typography>
            <Typography variant="body2" color="warning.main">
              • Flagged for review: {flagged.size}
            </Typography>
          </Box>
          {questions.length - answeredCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              You have {questions.length - answeredCount} unanswered question(s).
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Review Answers</Button>
          <Button variant="contained" onClick={() => handleSubmit(true)} disabled={submitting}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Time Up Dialog */}
      <Dialog open={timeUpDialogOpen} disableEscapeKeyDown>
        <DialogTitle>Time's Up!</DialogTitle>
        <DialogContent>
          <Typography>
            Your time has expired. Your test will be submitted automatically.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => handleSubmit(true)} disabled={submitting}>
            Submit Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TakeTestPage;
