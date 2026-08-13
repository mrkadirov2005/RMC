// Page component for the tests screen in the crm feature.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/utils/errorMessage';
import { cn } from '@/lib/utils';
import { testAPI } from './api';
import type { TestAnswer, TestSubmission } from '@/types';
import { countWords, formatCorrectAnswer, formatStudentAnswer } from './answerFormat';
import { getQuestionTypeMeta } from './questionTypes';
import { formatTestType } from './testVisuals';

// Renders the grade submission page screen.
const GradeSubmissionPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<TestSubmission | null>(null);
  const [grades, setGrades] = useState<{ [key: number]: { marks: number; feedback: string } }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

// Runs side effects for this component.
  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

// Loads submission.
  const loadSubmission = async () => {
    try {
      setLoading(true);
      const response = await testAPI.getSubmissionDetails(Number(submissionId));
      setSubmission(response.data);

      // Initialize grades from existing data
      const initialGrades: { [key: number]: { marks: number; feedback: string } } = {};
      response.data.answers?.forEach((answer: TestAnswer) => {
        initialGrades[answer.question_id] = {
          marks: Number(answer.marks_obtained ?? (answer.is_correct ? answer.marks : 0)),
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

// Handles grade change.
  const handleGradeChange = (questionId: number, field: 'marks' | 'feedback', value: any) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }));
  };

// Handles quick grade.
  const handleQuickGrade = (questionId: number, marks: number) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        marks,
      },
    }));
  };

// Handles calculate total score.
  const calculateTotalScore = () => {
    return Object.values(grades).reduce((sum, g) => sum + (Number(g.marks) || 0), 0);
  };

// Handles save.
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

      navigate(`/tests/${submission?.test_id}`);
    } catch (err: any) {
      console.error('Error saving grades:', err);
      setError(err.response?.data?.error || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Submission not found</AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const totalScore = calculateTotalScore();
  const isPassing = totalScore >= (submission.passing_marks || 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(`/tests/${submission.test_id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Grade Submission</h1>
          <p className="text-gray-500">
            {submission.test_name} - {submission.first_name} {submission.last_name}
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Grades'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          <button
            onClick={() => setError(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </Alert>
      )}

      {/* Score Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Student</h3>
              <p>{submission.first_name} {submission.last_name}</p>
              {submission.enrollment_number && (
                <p className="text-sm text-gray-500">{submission.enrollment_number}</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Current Score</h3>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-4xl font-bold',
                    isPassing ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {totalScore}
                </span>
                <span className="text-xl text-gray-500">/ {submission.total_marks}</span>
              </div>
              <Badge
                className={cn(
                  'mt-1',
                  isPassing
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                )}
              >
                {isPassing ? 'Passing' : 'Failing'}
              </Badge>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Submission Info</h3>
              <p className="text-sm">
                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
              </p>
              <p className="text-sm">
                Status: <Badge variant="outline" className="ml-1">{submission.status}</Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions and Grading */}
      {submission.answers?.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-gray-500">No answers to grade</p>
          </CardContent>
        </Card>
      ) : (
        submission.answers?.map((answer, index) => {
          const meta = getQuestionTypeMeta(answer.question_type);
          return (
          <Card key={answer.question_id} className="mb-4">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm text-gray-500">
                    Question {index + 1} • {formatTestType(answer.question_type)}
                  </p>
                  <h3 className="text-lg font-semibold mt-1">{answer.question_text}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {!meta.manualGraded && (
                    <Badge
                      className={cn(
                        answer.is_correct
                          ? 'bg-green-100 text-green-800 hover:bg-green-100'
                          : 'bg-red-100 text-red-800 hover:bg-red-100'
                      )}
                    >
                      {answer.is_correct ? <Check className="mr-1 h-3 w-3" /> : <X className="mr-1 h-3 w-3" />}
                      Auto-graded
                    </Badge>
                  )}
                  <Badge variant="outline">{answer.marks} marks</Badge>
                </div>
              </div>

              <hr className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Answer */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Student's Answer</p>
                  <div className="p-4 bg-gray-100 rounded-lg min-h-[80px] whitespace-pre-wrap">
                    {formatStudentAnswer(answer, answer.student_answer)}
                  </div>
                  {meta.supportsWordLimit && (
                    <p className="text-sm text-gray-500 mt-2">
                      {countWords(answer.student_answer?.text)} words
                      {answer.word_limit ? ` (limit ${answer.word_limit})` : ''}
                    </p>
                  )}
                </div>

                {/* Correct Answer or Rubric */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    {meta.supportsWordLimit ? 'Grading Rubric' : 'Correct Answer'}
                  </p>
                  <div className="p-4 bg-green-50 rounded-lg min-h-[80px] whitespace-pre-wrap">
                    {meta.supportsWordLimit
                      ? answer.rubric || <em className="text-gray-400">No rubric provided</em>
                      : formatCorrectAnswer(answer)}
                  </div>
                  {answer.explanation && (
                    <p className="text-sm text-gray-500 mt-2">
                      <strong>Explanation:</strong> {answer.explanation}
                    </p>
                  )}
                </div>
              </div>

              {/* Grading Section */}
              <hr className="my-4" />
              {meta.manualGraded ? (
              <div className="flex gap-6 items-start flex-wrap">
                {/* Quick Grade Buttons */}
                <div>
                  <p className="text-sm font-medium mb-2">Quick Grade</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={grades[answer.question_id]?.marks === 0 ? 'default' : 'outline'}
                      className={cn(
                        grades[answer.question_id]?.marks === 0 &&
                          'bg-red-600 hover:bg-red-700 text-white'
                      )}
                      onClick={() => handleQuickGrade(answer.question_id, 0)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      0
                    </Button>
                    {answer.marks > 1 && (
                      <Button
                        size="sm"
                        variant={
                          grades[answer.question_id]?.marks === Math.floor(answer.marks / 2)
                            ? 'default'
                            : 'outline'
                        }
                        className={cn(
                          grades[answer.question_id]?.marks === Math.floor(answer.marks / 2) &&
                            'bg-amber-500 hover:bg-amber-600 text-white'
                        )}
                        onClick={() => handleQuickGrade(answer.question_id, Math.floor(answer.marks / 2))}
                      >
                        {Math.floor(answer.marks / 2)}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={
                        grades[answer.question_id]?.marks === answer.marks ? 'default' : 'outline'
                      }
                      className={cn(
                        grades[answer.question_id]?.marks === answer.marks &&
                          'bg-green-600 hover:bg-green-700 text-white'
                      )}
                      onClick={() => handleQuickGrade(answer.question_id, answer.marks)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      {answer.marks}
                    </Button>
                  </div>
                </div>

                {/* Manual Marks */}
                <div>
                  <p className="text-sm font-medium mb-2">Marks Awarded</p>
                  <Input
                    type="number"
                    value={grades[answer.question_id]?.marks ?? 0}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      handleGradeChange(
                        answer.question_id,
                        'marks',
                        Number.isFinite(value) ? Math.max(0, Math.min(value, answer.marks)) : 0
                      );
                    }}
                    min={0}
                    max={answer.marks}
                    step={0.5}
                    className="w-24"
                  />
                </div>

                {/* Feedback */}
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium mb-2">Feedback (optional)</p>
                  <Textarea
                    placeholder="Add feedback for this answer..."
                    value={grades[answer.question_id]?.feedback || ''}
                    onChange={(e) =>
                      handleGradeChange(answer.question_id, 'feedback', e.target.value)
                    }
                    rows={2}
                  />
                </div>
              </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Auto-graded: {grades[answer.question_id]?.marks ?? 0} / {answer.marks} marks
                </p>
              )}
            </CardContent>
          </Card>
          );
        })
      )}

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Grades ({totalScore}/{submission.total_marks})
        </Button>
      </div>
    </div>
  );
};

export default GradeSubmissionPage;
