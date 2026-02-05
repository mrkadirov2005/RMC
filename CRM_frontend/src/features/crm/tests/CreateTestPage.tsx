import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Divider,
  IconButton,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { testAPI, subjectAPI, centerAPI } from '../../../shared/api/api';
import { useAppSelector } from '../hooks';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  marks: number;
  options?: string[];
  correct_answer?: any;
  explanation?: string;
  word_limit?: number;
}

interface Passage {
  id: string;
  title: string;
  content: string;
  difficulty_level: string;
}

const CreateTestPage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  
  // Test basic info
  const [testData, setTestData] = useState({
    test_name: '',
    test_type: 'multiple_choice',
    description: '',
    instructions: '',
    subject_id: '',
    center_id: user?.center_id || 1,
    total_marks: 0,
    passing_marks: 0,
    duration_minutes: 60,
    is_timed: true,
    shuffle_questions: false,
    show_results_immediately: true,
    allow_retake: false,
    max_retakes: 1,
    assignment_type: 'all_students',
  });

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Passages (for reading tests)
  const [passages, setPassages] = useState<Passage[]>([]);

  const steps = ['Basic Info', 'Add Questions', 'Settings', 'Review'];

  const testTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'essay', label: 'Essay' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'true_false', label: 'True/False' },
    { value: 'form_filling', label: 'Form Filling' },
    { value: 'reading_passage', label: 'Reading Passage' },
    { value: 'writing', label: 'Writing' },
    { value: 'matching', label: 'Matching' },
  ];

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [subjectsRes, centersRes] = await Promise.all([
        subjectAPI.getAll(),
        centerAPI.getAll(),
      ]);
      setSubjects(subjectsRes.data || []);
      setCenters(centersRes.data || []);
    } catch (err) {
      console.error('Error loading options:', err);
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question_text: '',
      question_type: testData.test_type === 'reading_passage' ? 'multiple_choice' : testData.test_type,
      marks: 1,
      options: testData.test_type === 'multiple_choice' || testData.test_type === 'true_false' ? ['', '', '', ''] : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const addOption = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options) {
      updateQuestion(questionId, { options: [...question.options, ''] });
    }
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options) {
      const newOptions = [...question.options];
      newOptions[index] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const deleteOption = (questionId: string, index: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options && question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== index);
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const addPassage = () => {
    const newPassage: Passage = {
      id: Date.now().toString(),
      title: '',
      content: '',
      difficulty_level: 'medium',
    };
    setPassages([...passages, newPassage]);
  };

  const updatePassage = (id: string, updates: Partial<Passage>) => {
    setPassages(passages.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePassage = (id: string) => {
    setPassages(passages.filter((p) => p.id !== id));
  };

  const calculateTotalMarks = () => {
    return questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const formattedQuestions = questions.map((q, index) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        question_order: index + 1,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        word_limit: q.word_limit,
        is_required: true,
      }));

      const formattedPassages = passages.map((p, index) => ({
        title: p.title,
        content: p.content,
        difficulty_level: p.difficulty_level,
        passage_order: index + 1,
      }));

      const submitData = {
        ...testData,
        total_marks: calculateTotalMarks(),
        passing_marks: testData.passing_marks || Math.ceil(calculateTotalMarks() * 0.6),
        created_by: user?.id,
        created_by_type: user?.userType || 'superuser',
        questions: formattedQuestions,
        passages: testData.test_type === 'reading_passage' ? formattedPassages : undefined,
      };

      await testAPI.create(submitData);
      navigate('/tests');
    } catch (err: any) {
      console.error('Error creating test:', err);
      setError(err.response?.data?.error || 'Failed to create test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="Test Name"
          value={testData.test_name}
          onChange={(e) => setTestData({ ...testData, test_name: e.target.value })}
          required
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>Test Type</InputLabel>
          <Select
            value={testData.test_type}
            label="Test Type"
            onChange={(e) => setTestData({ ...testData, test_type: e.target.value })}
          >
            {testTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <InputLabel>Subject</InputLabel>
          <Select
            value={testData.subject_id}
            label="Subject"
            onChange={(e) => setTestData({ ...testData, subject_id: e.target.value })}
          >
            <MenuItem value="">No Subject</MenuItem>
            {subjects.map((subject) => (
              <MenuItem key={subject.subject_id} value={subject.subject_id}>
                {subject.subject_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="Description"
          value={testData.description}
          onChange={(e) => setTestData({ ...testData, description: e.target.value })}
          multiline
          rows={3}
        />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          label="Instructions"
          value={testData.instructions}
          onChange={(e) => setTestData({ ...testData, instructions: e.target.value })}
          multiline
          rows={3}
          placeholder="Enter instructions for students taking this test..."
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          type="number"
          label="Duration (minutes)"
          value={testData.duration_minutes}
          onChange={(e) => setTestData({ ...testData, duration_minutes: parseInt(e.target.value) || 60 })}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          type="number"
          label="Passing Marks"
          value={testData.passing_marks}
          onChange={(e) => setTestData({ ...testData, passing_marks: parseInt(e.target.value) || 0 })}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControl fullWidth>
          <InputLabel>Center</InputLabel>
          <Select
            value={testData.center_id}
            label="Center"
            onChange={(e) => setTestData({ ...testData, center_id: e.target.value })}
          >
            {centers.map((center) => (
              <MenuItem key={center.center_id} value={center.center_id}>
                {center.center_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderQuestions = () => (
    <Box>
      {/* Reading Passages Section */}
      {testData.test_type === 'reading_passage' && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Reading Passages</Typography>
            <Button startIcon={<AddIcon />} onClick={addPassage}>
              Add Passage
            </Button>
          </Box>
          {passages.map((passage, index) => (
            <Paper key={passage.id} sx={{ p: 3, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Passage {index + 1}
                </Typography>
                <IconButton size="small" color="error" onClick={() => deletePassage(passage.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={passage.title}
                    onChange={(e) => updatePassage(passage.id, { title: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Difficulty</InputLabel>
                    <Select
                      value={passage.difficulty_level}
                      label="Difficulty"
                      onChange={(e) => updatePassage(passage.id, { difficulty_level: e.target.value })}
                    >
                      <MenuItem value="easy">Easy</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="hard">Hard</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Passage Content"
                    value={passage.content}
                    onChange={(e) => updatePassage(passage.id, { content: e.target.value })}
                    multiline
                    rows={6}
                  />
                </Grid>
              </Grid>
            </Paper>
          ))}
          <Divider sx={{ my: 3 }} />
        </Box>
      )}

      {/* Questions Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">Questions</Typography>
          <Typography variant="body2" color="text.secondary">
            Total Marks: {calculateTotalMarks()}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={addQuestion}>
          Add Question
        </Button>
      </Box>

      {questions.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            bgcolor: '#f9f9f9',
            borderRadius: 2,
            border: '2px dashed #e0e0e0',
          }}
        >
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No questions added yet
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addQuestion}>
            Add First Question
          </Button>
        </Box>
      ) : (
        questions.map((question, index) => (
          <Paper key={question.id} sx={{ p: 3, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DragIcon color="action" />
                <Chip label={`Q${index + 1}`} size="small" color="primary" />
                <Chip label={`${question.marks} marks`} size="small" variant="outlined" />
              </Box>
              <IconButton size="small" color="error" onClick={() => deleteQuestion(question.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Question Text"
                  value={question.question_text}
                  onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Question Type</InputLabel>
                  <Select
                    value={question.question_type}
                    label="Question Type"
                    onChange={(e) => updateQuestion(question.id, { question_type: e.target.value })}
                  >
                    {testTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Marks"
                  value={question.marks}
                  onChange={(e) => updateQuestion(question.id, { marks: parseInt(e.target.value) || 1 })}
                  size="small"
                />
              </Grid>

              {/* Options for MCQ */}
              {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Options
                  </Typography>
                  {question.question_type === 'true_false' ? (
                    <FormControl fullWidth size="small">
                      <InputLabel>Correct Answer</InputLabel>
                      <Select
                        value={question.correct_answer?.value ?? ''}
                        label="Correct Answer"
                        onChange={(e) => updateQuestion(question.id, { correct_answer: { value: e.target.value === 'true' } })}
                      >
                        <MenuItem value="true">True</MenuItem>
                        <MenuItem value="false">False</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <>
                      {question.options?.map((option, optIndex) => (
                        <Box key={optIndex} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder={`Option ${optIndex + 1}`}
                            value={option}
                            onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                          />
                          <IconButton
                            size="small"
                            color={question.correct_answer?.index === optIndex ? 'success' : 'default'}
                            onClick={() => updateQuestion(question.id, { correct_answer: { index: optIndex } })}
                          >
                            ✓
                          </IconButton>
                          {question.options && question.options.length > 2 && (
                            <IconButton size="small" color="error" onClick={() => deleteOption(question.id, optIndex)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      ))}
                      <Button size="small" onClick={() => addOption(question.id)}>
                        Add Option
                      </Button>
                    </>
                  )}
                </Grid>
              )}

              {/* Word limit for essay/writing */}
              {(question.question_type === 'essay' || question.question_type === 'writing') && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Word Limit (optional)"
                    value={question.word_limit || ''}
                    onChange={(e) => updateQuestion(question.id, { word_limit: parseInt(e.target.value) || undefined })}
                    size="small"
                  />
                </Grid>
              )}

              {/* Correct answer for short answer/form filling */}
              {(question.question_type === 'short_answer' || question.question_type === 'form_filling') && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Correct Answer(s) - comma separated for multiple accepted answers"
                    value={question.correct_answer?.answers?.join(', ') || ''}
                    onChange={(e) => updateQuestion(question.id, { 
                      correct_answer: { answers: e.target.value.split(',').map(a => a.trim()) } 
                    })}
                    size="small"
                  />
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Explanation (shown after submission)"
                  value={question.explanation || ''}
                  onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>
        ))
      )}
    </Box>
  );

  const renderSettings = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Test Settings
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={testData.is_timed}
                    onChange={(e) => setTestData({ ...testData, is_timed: e.target.checked })}
                  />
                }
                label="Timed Test"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={testData.shuffle_questions}
                    onChange={(e) => setTestData({ ...testData, shuffle_questions: e.target.checked })}
                  />
                }
                label="Shuffle Questions"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={testData.show_results_immediately}
                    onChange={(e) => setTestData({ ...testData, show_results_immediately: e.target.checked })}
                  />
                }
                label="Show Results Immediately"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={testData.allow_retake}
                    onChange={(e) => setTestData({ ...testData, allow_retake: e.target.checked })}
                  />
                }
                label="Allow Retakes"
              />
              {testData.allow_retake && (
                <TextField
                  type="number"
                  label="Maximum Retakes"
                  value={testData.max_retakes}
                  onChange={(e) => setTestData({ ...testData, max_retakes: parseInt(e.target.value) || 1 })}
                  size="small"
                  sx={{ ml: 4, width: 150 }}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Assignment
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Assign To</InputLabel>
              <Select
                value={testData.assignment_type}
                label="Assign To"
                onChange={(e) => setTestData({ ...testData, assignment_type: e.target.value })}
              >
                <MenuItem value="all_students">All Students</MenuItem>
                <MenuItem value="specific_students">Specific Students</MenuItem>
                <MenuItem value="specific_class">Specific Class</MenuItem>
                <MenuItem value="specific_teacher">Specific Teacher's Students</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You can assign this test to specific students after creation.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderReview = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Review your test details before creating.
      </Alert>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography><strong>Name:</strong> {testData.test_name}</Typography>
                <Typography><strong>Type:</strong> {testTypes.find(t => t.value === testData.test_type)?.label}</Typography>
                <Typography><strong>Duration:</strong> {testData.duration_minutes} minutes</Typography>
                <Typography><strong>Total Marks:</strong> {calculateTotalMarks()}</Typography>
                <Typography><strong>Passing Marks:</strong> {testData.passing_marks || Math.ceil(calculateTotalMarks() * 0.6)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Content Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography><strong>Questions:</strong> {questions.length}</Typography>
                {testData.test_type === 'reading_passage' && (
                  <Typography><strong>Passages:</strong> {passages.length}</Typography>
                )}
                <Typography><strong>Timed:</strong> {testData.is_timed ? 'Yes' : 'No'}</Typography>
                <Typography><strong>Retakes Allowed:</strong> {testData.allow_retake ? `Yes (${testData.max_retakes})` : 'No'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderQuestions();
      case 2:
        return renderSettings();
      case 3:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/tests')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Create New Test
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {getStepContent(activeStep)}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          variant="outlined"
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          {loading ? 'Creating...' : activeStep === steps.length - 1 ? 'Create Test' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
};

export default CreateTestPage;
