// The teacher's Tests tab. Opens straight on the list of tests — no statistics
// overview, which is a centre-wide view for staff — with each card carrying what a
// teacher acts on: how big the test is, whether it is live, and how much marking
// is waiting. Opening a test shows it in place, inside the portal, and back
// returns to this list.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ClipboardList,
  Clock,
  Eye,
  FileQuestion,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageToolbar } from '@/components/common/PageToolbar';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { useAppSelector } from '../../crm/hooks';
import { formatTestType, getTestTypeBadgeClass, getTestTypeTheme } from '../../crm/tests/testVisuals';
import { TEST_TYPES } from '../../crm/tests/questionTypes';
import TestDetailPage from '../../crm/tests/TestDetailPage';
import { testAPI } from '../api';
import {
  DEFAULT_FILTERS,
  filterTeacherTests,
  isAuthor,
  summarizeTeacherTests,
  type StatusFilter,
  type TeacherTestFilters,
  type TeacherTestRow,
} from './teacherTestsModel';

export const TeacherTestsView = () => {
  const navigate = useNavigate();
  const teacherId = useAppSelector((state) => state.auth.user?.id ?? null);

  const [tests, setTests] = useState<TeacherTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TeacherTestFilters>(DEFAULT_FILTERS);
  const [openTestId, setOpenTestId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TeacherTestRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await testAPI.getAll();
      setTests(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError('Could not load your tests. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const visibleTests = useMemo(() => filterTeacherTests(tests, filters, teacherId), [tests, filters, teacherId]);
  const summary = useMemo(() => summarizeTeacherTests(tests, teacherId), [tests, teacherId]);

  const updateFilter = <K extends keyof TeacherTestFilters>(key: K, value: TeacherTestFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await testAPI.delete(pendingDelete.test_id);
      setPendingDelete(null);
      await loadTests();
    } catch {
      setError('Could not delete that test. Only the teacher who created a test can delete it.');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // A test opened from the list is shown in place, so the teacher never leaves the
  // portal just to look at one.
  if (openTestId != null) {
    return (
      <TestDetailPage
        testId={openTestId}
        onBack={() => {
          setOpenTestId(null);
          loadTests();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">My tests</h2>
          <p className="text-sm text-muted-foreground">Open a test to see its questions and results.</p>
        </div>
        <Button onClick={() => navigate('/tests/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create test
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        {[
          { label: 'My tests', value: summary.mine },
          { label: 'Active', value: summary.active },
          { label: 'Submissions', value: summary.submissions },
          { label: 'To grade', value: summary.toGrade },
        ].map((tile) => (
          <div key={tile.label} className="bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{tile.label}</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{tile.value}</p>
          </div>
        ))}
      </div>

      <PageToolbar>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={filters.owner} onValueChange={(value) => updateFilter('owner', value as 'mine' | 'all')}>
            <TabsList>
              <TabsTrigger value="mine">Created by me</TabsTrigger>
              <TabsTrigger value="all">All I can see</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="teacher-tests-search"
                placeholder="Search tests..."
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value as StatusFilter)}>
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="to_grade">Needs grading</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.testType} onValueChange={(value) => updateFilter('testType', value)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TEST_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatTestType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PageToolbar>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visibleTests.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title={tests.length === 0 ? 'No tests yet' : 'No tests match'}
          description={
            tests.length === 0
              ? 'Create your first test to get started.'
              : filters.owner === 'mine' && summary.mine === 0
                ? 'You have not created a test yet. Switch to "All I can see" to view shared tests.'
                : 'Try a different search or filter.'
          }
          action={
            tests.length === 0 ? (
              <Button onClick={() => navigate('/tests/create')}>
                <Plus className="mr-2 h-4 w-4" />
                Create test
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTests.map((test) => {
            const mine = isAuthor(test, teacherId);
            const toGrade = Number(test.awaiting_grading_count || 0);
            return (
              <Card
                key={test.test_id}
                className="h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                onClick={() => setOpenTestId(test.test_id)}
              >
                <div className={cn('h-1', getTestTypeTheme(test.test_type).dot)} />
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className={getTestTypeBadgeClass(test.test_type)}>{formatTestType(test.test_type)}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={test.is_active ? 'default' : 'secondary'}>
                        {test.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Options for ${test.test_name}`}
                            className="rounded-md p-1 hover:bg-muted"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenuItem onClick={() => setOpenTestId(test.test_id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open
                          </DropdownMenuItem>
                          {mine && (
                            <DropdownMenuItem onClick={() => navigate(`/tests/${test.test_id}/edit`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => navigate(`/tests/${test.test_id}/assign`)}>
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Assign
                          </DropdownMenuItem>
                          {mine && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setPendingDelete(test)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <h3 className="mb-1 text-base font-semibold text-foreground">{test.test_name}</h3>
                  {test.subject_name && <p className="mb-1 text-sm text-primary">{test.subject_name}</p>}
                  {test.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{test.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileQuestion className="h-4 w-4" />
                      {Number(test.question_count || 0)} questions
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      {Number(test.total_marks || 0)} marks
                    </span>
                    {test.duration_minutes != null && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {test.duration_minutes} min
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
                    <span className="text-muted-foreground">
                      {Number(test.submission_count || 0)} submissions
                    </span>
                    {toGrade > 0 && <Badge variant="outline">{toGrade} to grade</Badge>}
                    {!mine && <Badge variant="secondary">Shared by another teacher</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete test</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete "{pendingDelete?.test_name}"? Its questions and submissions go with it. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherTestsView;
