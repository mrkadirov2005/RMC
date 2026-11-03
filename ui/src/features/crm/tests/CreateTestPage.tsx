// Page component for the tests screen in the crm feature.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Check,
  Eye,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTestsHome } from './useTestsHome';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/utils/errorMessage';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { fetchCentersForce } from '../../../slices/centersSlice';
import { fetchSubjects, fetchSubjectsForce } from '../../../slices/subjectsSlice';
import { createTest, fetchTestsForce } from '../../../slices/testsSlice';
import { testAPI } from './api';
import { canEditTest, planSave, questionProblems, toEditablePassages, toEditableQuestions } from './testEditModel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuestionAnswer } from './components/QuestionAnswer';
import { selectCenterOptions, selectSubjectOptions } from '../../../store/selectors';
import { useAppDispatch, useAppSelector } from '../hooks';
import { getResolvedCenterId } from '../../../shared/auth/centerScope';
import { QUESTION_TYPES, TEST_TYPES, getQuestionTypeMeta } from './questionTypes';
import { formatTestType } from './testVisuals';

const authorableQuestionTypes = QUESTION_TYPES.filter(
  (type) => type !== 'reading_passage' && type !== 'matching'
);

interface Question {
  id: string;
  question_id?: number;
  question_text: string;
  question_type: string;
  marks: number;
  options?: string[];
  correct_answer?: any;
  explanation?: string;
  word_limit?: number;
  rubric?: string;
  is_required?: boolean;
}

interface Passage {
  id: string;
  passage_id?: number;
  title: string;
  content: string;
  difficulty_level: string;
}

// Renders the create test page screen.
const CreateTestPage = () => {
  const { t } = useLanguage();
  const testsHome = useTestsHome();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const subjectOptions = useAppSelector(selectSubjectOptions);
  const centerOptions = useAppSelector(selectCenterOptions);

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test basic info
  const [testData, setTestData] = useState({
    test_name: '',
    test_type: 'multiple_choice',
    description: '',
    instructions: '',
    subject_id: '',
    center_id: getResolvedCenterId(user) ?? 0,
    total_marks: 0,
    passing_marks: 0,
    duration_minutes: 60,
    is_timed: true,
    shuffle_questions: false,
    show_results_immediately: true,
    allow_retake: false,
    max_retakes: 1,
    assignment_type: 'all_students',
    is_private: false,
  });

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);

  // Passages (for reading tests)
  const [passages, setPassages] = useState<Passage[]>([]);

  // The pass mark is set as a share of the marks; the marks are worked out when saving.
  const [passPercent, setPassPercent] = useState(60);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState<any>(null);
  const [showProblems, setShowProblems] = useState(false);

  const steps = ['Details', 'Questions', 'Settings', 'Review'];

  // /tests/:testId/edit renders this same page. Before, it ignored the id, opened
  // an empty form, and saving created a second copy of the test.
  const { testId: editTestIdParam } = useParams();
  const editTestId = editTestIdParam ? Number(editTestIdParam) : null;
  const isEditMode = editTestId != null;
  const [loadingTest, setLoadingTest] = useState(isEditMode);
  const [editBlocked, setEditBlocked] = useState<string | null>(null);
  const [originalQuestionIds, setOriginalQuestionIds] = useState<number[]>([]);
  const [originalPassageIds, setOriginalPassageIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await testAPI.getById(Number(editTestId));
        const saved = response.data;
        if (cancelled) return;
        if (!canEditTest(saved, user)) {
          setEditBlocked(t('Only the teacher who created this test can edit it.'));
          return;
        }
        setTestData((current) => ({
          ...current,
          test_name: saved.test_name ?? '',
          test_type: saved.test_type ?? current.test_type,
          description: saved.description ?? '',
          instructions: saved.instructions ?? '',
          subject_id: saved.subject_id != null ? String(saved.subject_id) : '',
          center_id: saved.center_id ?? current.center_id,
          total_marks: Number(saved.total_marks ?? 0),
          passing_marks: Number(saved.passing_marks ?? 0),
          duration_minutes: Number(saved.duration_minutes ?? current.duration_minutes),
          is_timed: Boolean(saved.is_timed),
          shuffle_questions: Boolean(saved.shuffle_questions),
          show_results_immediately: Boolean(saved.show_results_immediately),
          allow_retake: Boolean(saved.allow_retake),
          max_retakes: Number(saved.max_retakes ?? 1),
          assignment_type: saved.assignment_type ?? current.assignment_type,
          is_private: Boolean(saved.is_private),
        }));
        const loadedQuestions = toEditableQuestions(saved.questions);
        const loadedPassages = toEditablePassages(saved.passages);
        setQuestions(loadedQuestions);
        setPassages(loadedPassages);
        const savedTotal = Number(saved.total_marks ?? 0);
        if (savedTotal > 0) setPassPercent(Math.round((Number(saved.passing_marks ?? 0) / savedTotal) * 100));
        setOriginalQuestionIds(loadedQuestions.map((q) => q.question_id as number));
        setOriginalPassageIds(loadedPassages.map((p) => p.passage_id as number));
      } catch {
        if (!cancelled) setEditBlocked(t('This test could not be loaded. It may have been deleted.'));
      } finally {
        if (!cancelled) setLoadingTest(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editTestId, isEditMode, user]);

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchSubjects());
    dispatch(fetchCentersForce());
  }, [dispatch]);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchSubjectsForce());
      dispatch(fetchCentersForce());
      setTestData((prev) => ({
        ...prev,
        center_id: getResolvedCenterId(user) ?? prev.center_id,
      }));
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, user]);

// Handles next.
  const problemsByQuestion = questions
    .map((question, index) => ({ number: index + 1, problems: questionProblems(question) }))
    .filter((item) => item.problems.length > 0);

  // A step with something missing says what, instead of saving a test students cannot answer.
  const stepError = (step: number): string | null => {
    if (step === 0 && !testData.test_name.trim()) return t('Give the test a name.');
    if (step === 1 && questions.length === 0) return t('Add at least one question.');
    if (step === 1 && problemsByQuestion.length > 0) return t('Some questions are not finished: {numbers}.', { numbers: problemsByQuestion.map((item) => item.number).join(', ') });
    return null;
  };

  const handleNext = () => {
    const problem = stepError(activeStep);
    if (problem) {
      setError(problem);
      setShowProblems(true);
      return;
    }
    setError(null);
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

// Handles back.
  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

// Handles add question.
  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question_text: '',
      question_type: (authorableQuestionTypes as readonly string[]).includes(testData.test_type)
        ? testData.test_type
        : 'multiple_choice',
      marks: 1,
      options: testData.test_type === 'multiple_choice' ? ['', '', '', ''] : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

// Updates question.
  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== id) return q;
        const next = { ...q, ...updates };
        // Changing the type starts its answer afresh: a choice gets four empty options.
        if (updates.question_type && updates.question_type !== q.question_type) {
          next.correct_answer = undefined;
          next.options = updates.question_type === 'multiple_choice' ? (q.options?.length ? q.options : ['', '', '', '']) : undefined;
        }
        return next;
      })
    );
  };

// Deletes question.
  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

// Handles add option.
  const addOption = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options) {
      updateQuestion(questionId, { options: [...question.options, ''] });
    }
  };

// Updates option.
  const updateOption = (questionId: string, index: number, value: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options) {
      const newOptions = [...question.options];
      newOptions[index] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

// Deletes option.
  const deleteOption = (questionId: string, index: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options && question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== index);
      updateQuestion(questionId, { options: newOptions });
    }
  };

// Handles add passage.
  const addPassage = () => {
    const newPassage: Passage = {
      id: Date.now().toString(),
      title: '',
      content: '',
      difficulty_level: 'medium',
    };
    setPassages([...passages, newPassage]);
  };

// Updates passage.
  const updatePassage = (id: string, updates: Partial<Passage>) => {
    setPassages(passages.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

// Deletes passage.
  const deletePassage = (id: string) => {
    setPassages(passages.filter((p) => p.id !== id));
  };

// Handles calculate total marks.
  const calculateTotalMarks = () => {
    return questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  };

// Handles submit.
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
        rubric: q.rubric,
        is_required: q.is_required ?? true,
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
        passing_marks: Math.ceil((calculateTotalMarks() * passPercent) / 100),
        created_by: user?.id,
        created_by_type: user?.userType || 'superuser',
        questions: formattedQuestions,
        passages: testData.test_type === 'reading_passage' ? formattedPassages : undefined,
      };

      if (isEditMode) {
        const { questions: _questions, passages: _passages, created_by: _createdBy, created_by_type: _createdByType, ...fields } = submitData;
        await testAPI.update(Number(editTestId), fields);

        const questionPlan = planSave(
          formattedQuestions.map((question, index) => ({ ...question, question_id: questions[index].question_id })),
          originalQuestionIds,
          'question_id'
        );
        for (const questionId of questionPlan.remove) await testAPI.deleteQuestion(questionId);
        for (const question of questionPlan.update) {
          const { question_id: questionId, ...data } = question;
          await testAPI.updateQuestion(Number(questionId), data);
        }
        for (const question of questionPlan.create) {
          const { question_id: _unsaved, ...data } = question;
          await testAPI.addQuestion(Number(editTestId), data);
        }

        if (testData.test_type === 'reading_passage') {
          const passagePlan = planSave(
            formattedPassages.map((passage, index) => ({ ...passage, passage_id: passages[index].passage_id })),
            originalPassageIds,
            'passage_id'
          );
          for (const passageId of passagePlan.remove) await testAPI.deletePassage(passageId);
          for (const passage of passagePlan.update) {
            const { passage_id: passageId, ...data } = passage;
            await testAPI.updatePassage(Number(passageId), data);
          }
          for (const passage of passagePlan.create) {
            const { passage_id: _unsaved, ...data } = passage;
            await testAPI.addPassage(Number(editTestId), data);
          }
        }

        dispatch(fetchTestsForce());
      } else {
        await dispatch(createTest(submitData)).unwrap();
      }
      testsHome.goHome();
    } catch (err: any) {
      console.error(isEditMode ? 'Error saving test:' : 'Error creating test:', err);
      setError(
        err.response?.data?.error ||
          (isEditMode ? t('Failed to save your changes. Please try again.') : t('Failed to create test. Please try again.'))
      );
    } finally {
      setLoading(false);
    }
  };

// Renders basic info.
  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <Label htmlFor="test_name">{t('Test name')} *</Label>
        <Input
          id="test_name"
          value={testData.test_name}
          onChange={(e) => setTestData({ ...testData, test_name: e.target.value })}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="test_type">{t('Main question type')}</Label>
          <select
            id="test_type"
            value={testData.test_type}
            onChange={(e) => setTestData({ ...testData, test_type: e.target.value })}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {TEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(getQuestionTypeMeta(type).label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="subject_id">{t('Subject')}</Label>
          <select
            id="subject_id"
            value={testData.subject_id}
            onChange={(e) => setTestData({ ...testData, subject_id: e.target.value })}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{t('No subject')}</option>
            {subjectOptions.map((subject) => (
              <option key={subject.id || subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="description">{t('Description')}</Label>
        <Textarea
          id="description"
          value={testData.description}
          onChange={(e) => setTestData({ ...testData, description: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="instructions">{t('Instructions')}</Label>
        <Textarea
          id="instructions"
          value={testData.instructions}
          onChange={(e) => setTestData({ ...testData, instructions: e.target.value })}
          rows={3}
          placeholder={t('What students should know before they start...')}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="duration">{t('Time (minutes)')}</Label>
          <Input
            id="duration"
            type="number"
            value={testData.duration_minutes}
            onChange={(e) => setTestData({ ...testData, duration_minutes: parseInt(e.target.value) || 60 })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="pass_percent">{t('Pass mark (%)')}</Label>
          <div className="mt-1 flex gap-1.5">
            <Input
              id="pass_percent"
              type="number"
              min={1}
              max={100}
              value={passPercent}
              onChange={(e) => setPassPercent(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24"
            />
            {[50, 60, 70, 80].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPassPercent(value)}
                className={cn('rounded-md border px-2 text-xs font-semibold', passPercent === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted')}
              >
                {value}%
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('{marks} of {total} marks with the questions so far', { marks: Math.ceil((calculateTotalMarks() * passPercent) / 100), total: calculateTotalMarks() })}
          </p>
        </div>
        <div>
          <Label htmlFor="center_id">{t('Center')}</Label>
          <select
            id="center_id"
            value={testData.center_id}
            onChange={(e) => setTestData({ ...testData, center_id: Number(e.target.value) })}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {centerOptions.map((center) => (
              <option key={center.id || center.value} value={center.value}>
                {center.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

// Renders questions.
  const renderQuestions = () => (
    <div>
      {/* Reading Passages Section */}
      {testData.test_type === 'reading_passage' && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t('Reading texts')}</h3>
            <Button variant="outline" onClick={addPassage}>
              <Plus className="h-4 w-4 mr-2" />
              {t('Add a text')}
            </Button>
          </div>
          {passages.map((passage, index) => (
            <div key={passage.id} className="border rounded-lg p-4 mb-3 bg-background">
              <div className="flex justify-between mb-3">
                <h4 className="font-semibold">{t('Text {number}', { number: index + 1 })}</h4>
                <button
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  onClick={() => deletePassage(passage.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <Label>{t('Title')}</Label>
                  <Input
                    value={passage.title}
                    onChange={(e) => updatePassage(passage.id, { title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-4">
                  <Label>{t('Difficulty')}</Label>
                  <select
                    value={passage.difficulty_level}
                    onChange={(e) => updatePassage(passage.id, { difficulty_level: e.target.value })}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="easy">{t('Easy')}</option>
                    <option value="medium">{t('Medium')}</option>
                    <option value="hard">{t('Hard')}</option>
                  </select>
                </div>
                <div className="md:col-span-12">
                  <Label>{t('Text')}</Label>
                  <Textarea
                    value={passage.content}
                    onChange={(e) => updatePassage(passage.id, { content: e.target.value })}
                    rows={6}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
          <hr className="my-6" />
        </div>
      )}

      {/* Questions Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">{t('Questions')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('{count} questions · {marks} marks', { count: questions.length, marks: calculateTotalMarks() })}
            {problemsByQuestion.length > 0 && (
              <span className="ml-2 font-semibold text-amber-600">· {t('{count} not finished', { count: problemsByQuestion.length })}</span>
            )}
          </p>
        </div>
        <Button onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          {t('Add a question')}
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 bg-muted/40 rounded-lg border-2 border-dashed border">
          <p className="text-muted-foreground mb-4">{t('No questions added yet')}</p>
          <Button variant="outline" onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            {t('Add the first question')}
          </Button>
        </div>
      ) : (
        questions.map((question, index) => {
          const problems = questionProblems(question);
          return (
          <div key={question.id} className={cn('border rounded-lg p-4 mb-3 bg-background', showProblems && problems.length > 0 && 'border-amber-400 ring-1 ring-amber-300')}>
            <div className="flex justify-between items-start mb-3 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge>{index + 1}</Badge>
                <Badge variant="outline">{t('{count} marks', { count: question.marks })}</Badge>
                {problems.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {problems.map((problem) => t(problem)).join(' · ')}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setPreviewAnswer(null);
                    setPreviewQuestion(question);
                  }}
                >
                  <Eye className="h-4 w-4" />
                  {t('Preview')}
                </button>
                <button
                  type="button"
                  aria-label={t('Delete')}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  onClick={() => deleteQuestion(question.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>{t('Question')}</Label>
                <Textarea
                  value={question.question_text}
                  onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('Question type')}</Label>
                  <select
                    value={question.question_type}
                    onChange={(e) => updateQuestion(question.id, { question_type: e.target.value })}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {authorableQuestionTypes.map((type) => (
                      <option key={type} value={type}>
                        {t(getQuestionTypeMeta(type).label)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t('Marks')}</Label>
                  <Input
                    type="number"
                    value={question.marks}
                    onChange={(e) => updateQuestion(question.id, { marks: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* The answers: options with the right one marked, or True / False */}
              {question.question_type === 'true_false' && (
                <div>
                  <Label className="mb-2 block">{t('Right answer')}</Label>
                  <div className="grid grid-cols-2 gap-2 sm:w-80">
                    {[true, false].map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => updateQuestion(question.id, { correct_answer: { value } })}
                        className={cn(
                          'rounded-md border-2 px-3 py-2 text-sm font-semibold',
                          question.correct_answer?.value === value ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'hover:bg-muted'
                        )}
                      >
                        {value ? t('True') : t('False')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {question.question_type === 'multiple_choice' && (
                <div>
                  <Label className="mb-2 block">{t('Options — mark the right one')}</Label>
                  {(question.options || []).map((option, optIndex) => {
                    const isRight = question.correct_answer?.index === optIndex;
                    return (
                      <div key={optIndex} className={cn('mb-2 flex items-center gap-2 rounded-md p-1', isRight && 'bg-emerald-50 dark:bg-emerald-950/40')}>
                        <span className="w-6 text-center text-sm font-bold text-muted-foreground">{String.fromCharCode(65 + optIndex)}</span>
                        <Input placeholder={t('Option {letter}', { letter: String.fromCharCode(65 + optIndex) })} value={option} onChange={(e) => updateOption(question.id, optIndex, e.target.value)} />
                        <button
                          type="button"
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-semibold',
                            isRight ? 'border-emerald-500 bg-emerald-500 text-white' : 'text-muted-foreground hover:bg-muted'
                          )}
                          onClick={() => updateQuestion(question.id, { correct_answer: { index: optIndex } })}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t('Right')}
                        </button>
                        {question.options && question.options.length > 2 && (
                          <button type="button" aria-label={t('Delete')} className="rounded-md p-2 text-red-500 hover:bg-red-50" onClick={() => deleteOption(question.id, optIndex)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <Button variant="ghost" size="sm" onClick={() => addOption(question.id)}>
                    <Plus className="mr-1 h-4 w-4" />
                    {t('Add an option')}
                  </Button>
                </div>
              )}

              {/* Word limit and rubric for essay/writing */}
              {getQuestionTypeMeta(question.question_type).supportsWordLimit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('Word limit (optional)')}</Label>
                    <Input
                      type="number"
                      value={question.word_limit || ''}
                      onChange={(e) => updateQuestion(question.id, { word_limit: parseInt(e.target.value) || undefined })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>{t('How to grade (optional)')}</Label>
                    <Textarea
                      value={question.rubric || ''}
                      onChange={(e) => updateQuestion(question.id, { rubric: e.target.value })}
                      rows={3}
                      placeholder={t('Notes for the teacher who grades it...')}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Correct answer for short answer/form filling */}
              {(question.question_type === 'short_answer' || question.question_type === 'form_filling') && (
                <div>
                  <Label>{t('Right answer — separate several accepted answers with commas')}</Label>
                  <Input
                    value={question.correct_answer?.answers?.join(', ') || ''}
                    onChange={(e) => updateQuestion(question.id, {
                      correct_answer: { answers: e.target.value.split(',').map(a => a.trim()) }
                    })}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label>{t('Explanation (students see it after handing in)')}</Label>
                <Input
                  value={question.explanation || ''}
                  onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          );
        })
      )}
    </div>
  );

// Renders settings.
  const renderSettings = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">{t('Test settings')}</h3>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.is_timed}
                onChange={(e) => setTestData({ ...testData, is_timed: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">{t('Timed test')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.shuffle_questions}
                onChange={(e) => setTestData({ ...testData, shuffle_questions: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">{t('Shuffle the questions')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.show_results_immediately}
                onChange={(e) => setTestData({ ...testData, show_results_immediately: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">{t('Show the score straight after handing in')}</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.is_private}
                onChange={(e) => setTestData({ ...testData, is_private: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <span className="text-sm">
                {t('Private test')}
                <span className="block text-xs text-muted-foreground mt-1">
                  {t("Only its creator sees it, and, when a teacher made it, that teacher's students.")}
                </span>
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.allow_retake}
                onChange={(e) => setTestData({ ...testData, allow_retake: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">{t('Allow retakes')}</span>
            </label>
            {testData.allow_retake && (
              <div className="ml-7 w-36">
                <Label>{t('Up to (times)')}</Label>
                <Input
                  type="number"
                  value={testData.max_retakes}
                  onChange={(e) => setTestData({ ...testData, max_retakes: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">{t('Who takes it')}</h3>
          <div>
            <Label htmlFor="assignment_type">{t('Who can take it')}</Label>
            <select
              id="assignment_type"
              value={testData.assignment_type}
              onChange={(e) => setTestData({ ...testData, assignment_type: e.target.value })}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all_students">{t('All students')}</option>
              <option value="specific_students">{t('Chosen students')}</option>
              <option value="specific_class">{t('A group')}</option>
              <option value="specific_teacher">{t("A teacher's students")}</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('You can assign the test to students and groups once it is saved.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );

// Renders review.
  const renderReview = () => {
    const total = calculateTotalMarks();
    const rows: Array<[string, string | number]> = [
      ['Test name', testData.test_name],
      ['Main question type', t(formatTestType(testData.test_type))],
      ['Questions', questions.length],
      ['Marks', total],
      ['Pass mark', `${passPercent}% · ${t('{marks} of {total} marks', { marks: Math.ceil((total * passPercent) / 100), total })}`],
      ['Time', testData.is_timed ? t('{minutes} min', { minutes: testData.duration_minutes }) : t('No limit')],
      ['Retakes', testData.allow_retake ? t('Yes, up to {count}', { count: testData.max_retakes }) : t('No')],
      ['Show results', testData.show_results_immediately ? t('Straight away') : t('After grading')],
      ['Visibility', testData.is_private ? t('Private') : t('Public')],
    ];
    if (testData.test_type === 'reading_passage') rows.splice(3, 0, ['Reading texts', passages.length]);
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('Check everything once more, then save.')}</p>
        <dl className="divide-y rounded-lg border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{t(label)}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

// Returns step content.
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

  if (loadingTest) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // A teacher who opens the edit address for someone else's test gets told why,
  // rather than a form whose save the server would refuse.
  if (editBlocked) {
    return (
      <div className="space-y-5 p-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={testsHome.goHome}>
          <ArrowLeft className="h-4 w-4" />
          {t(testsHome.label)}
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{editBlocked}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={testsHome.goHome}>
        <ArrowLeft className="h-4 w-4" />
        {t(testsHome.label)}
      </Button>

      <PageHeader
        title={isEditMode ? t('Edit test') : t('Create test')}
        icon={ClipboardList}
        description={isEditMode ? t('Change the paper, its questions or its settings, then save.') : t('Set the paper up, write the questions, then choose who sits it.')}
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

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2',
                  index < activeStep
                    ? 'bg-primary text-primary-foreground border-primary'
                    : index === activeStep
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {index < activeStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:inline',
                  index <= activeStep ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {t(label)}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4',
                  index < activeStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {getStepContent(activeStep)}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          {t('Back')}
        </Button>
        <Button
          onClick={handleNext}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEditMode ? t('Saving...') : t('Creating...')}
            </>
          ) : activeStep === steps.length - 1 ? (
            isEditMode ? t('Save changes') : t('Create test')
          ) : (
            t('Next')
          )}
        </Button>
      </div>

      {/* A question as students will see it */}
      <Dialog open={Boolean(previewQuestion)} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('How students see it')}</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              <p className="whitespace-pre-wrap text-lg font-semibold">{previewQuestion.question_text || t('(no question text yet)')}</p>
              <QuestionAnswer
                question={{ ...previewQuestion, options: (previewQuestion.options || []).filter((option) => option.trim()) }}
                value={previewAnswer}
                onChange={setPreviewAnswer}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateTestPage;
