// Tests section landing page. Opens on an Overview of the whole catalogue —
// headline figures, the mix of question types, and which teachers' students do
// best — with the catalogue list itself on a second tab. Everything the list
// could do before it still does: search, type filter, active/inactive tabs,
// pagination and the per-card actions.
//
// The screen is built from the app's shared blocks (PageHeader, SectionPanel,
// PageToolbar, EmptyState) rather than the bespoke gradients this section used
// to carry, so it reads as the same product as the rest of the CRM.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  BarChart3,
  FileQuestion,
  Clock,
  CheckCircle,
  X,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { PageToolbar } from '@/components/common/PageToolbar';
import { SectionPanel } from '@/components/common/SectionPanel';
import { EmptyState } from '@/components/common/EmptyState';
import {
  clearTestsPageError,
  setTestsPageDeleteDialogOpen,
  setTestsPageError,
  setTestsPageFilterType,
  setTestsPageSearchTerm,
  setTestsPageSelectedTestId,
  setTestsPageTabValue,
} from '../../../slices/pagesUiSlice';
import { clearTestsError, deleteTest, fetchTests } from '../../../slices/testsSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import {
  makeSelectFilteredTestsForPageUi,
  selectTestsPageSelectedTest,
  selectTestsPageUi,
  selectTestsError,
  selectTestsLoading,
  selectTestsStats,
} from '../../../store/selectors';
import { formatTestType, getTestTypeBadgeClass, getTestTypeTheme } from './testVisuals';
import { TEST_TYPES } from './questionTypes';
import { PaginationBar, defaultCardPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';
import { testStatisticsApi, type TestStatistics } from './api/testStatisticsApi';
import { TestStatTiles } from './components/TestStatTiles';
import { TestTypeChart, type TestTypeSlice } from './components/TestTypeChart';
import { TeacherTestLeaderboard } from './components/TeacherTestLeaderboard';

interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  description?: string;
  total_marks: number;
  passing_marks: number;
  duration_minutes: number;
  is_active: boolean;
  is_private?: boolean;
  question_count?: number;
  submission_count?: number;
  subject_name?: string;
  created_at?: string;
}

type View = 'overview' | 'catalogue';

// Renders the tests page screen.
const TestsPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [view, setView] = useState<View>('overview');
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsError, setStatisticsError] = useState('');
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  const { user } = useAppSelector((state) => state.auth);
  const loading = useAppSelector(selectTestsLoading);
  const testsError = useAppSelector(selectTestsError);
  const stats = useAppSelector(selectTestsStats);
  const testsUi = useAppSelector(selectTestsPageUi);
  const { pageError, tabValue, searchTerm, filterType, deleteDialogOpen } = testsUi;
// Memoizes the select filtered tests derived value.
  const selectFilteredTests = useMemo(makeSelectFilteredTestsForPageUi, []);
  const filteredTests = useAppSelector((state) => selectFilteredTests(state)) as Test[];
  const paginatedTests = useMemo(
    () => paginateItems(filteredTests, page, pageSize),
    [filteredTests, page, pageSize]
  );
  const selectedTest = useAppSelector(selectTestsPageSelectedTest) as Test | null;
  const error = pageError || testsError;
  const canCreate = user?.userType === 'superuser' || user?.userType === 'teacher';

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchTests());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    testStatisticsApi
      .get()
      .then((data) => {
        if (!cancelled) setStatistics(data);
      })
      .catch(() => {
        if (!cancelled) setStatisticsError('Could not load the overview statistics.');
      })
      .finally(() => {
        if (!cancelled) setStatisticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

// Runs side effects for this component.
  useEffect(() => {
    setPage(1);
  }, [tabValue, searchTerm, filterType]);

// Handles delete.
  const handleDelete = async () => {
    if (selectedTest) {
      try {
        await dispatch(deleteTest(selectedTest.test_id)).unwrap();
        dispatch(setTestsPageDeleteDialogOpen(false));
        dispatch(setTestsPageSelectedTestId(null));
      } catch (err: any) {
        dispatch(setTestsPageError(err?.message || 'Failed to delete test.'));
      }
    }
  };

  // A slice click is a filter, not a drill-down dialog: it hands the type to the
  // catalogue tab and reuses the filter that was already there. The folded
  // "Other" slice has no single type to filter on, so it only highlights.
  const handleSliceSelect = useCallback(
    (slice: TestTypeSlice) => {
      if (selectedSlice === slice.key) {
        setSelectedSlice(null);
        dispatch(setTestsPageFilterType('all'));
        return;
      }
      setSelectedSlice(slice.key);
      if (slice.types.length === 1) {
        dispatch(setTestsPageFilterType(slice.types[0]));
        dispatch(setTestsPageTabValue('all'));
        setView('catalogue');
      }
    },
    [dispatch, selectedSlice]
  );

  const testTypes = [
    { value: 'all', label: 'All Types' },
    ...TEST_TYPES.map((type) => ({ value: type as string, label: formatTestType(type) })),
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="Tests"
        icon={ClipboardList}
        description="Create, assign, monitor and grade student assessments."
        primaryAction={
          canCreate ? (
            <Button onClick={() => navigate('/tests/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create test
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {getErrorMessage(error)}
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => {
                dispatch(clearTestsPageError());
                dispatch(clearTestsError());
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={view} onValueChange={(value) => setView(value as View)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="catalogue">All tests ({stats.total})</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'overview' ? (
        <div className="space-y-5">
          {statisticsError && (
            <Alert variant="destructive">
              <AlertDescription>{statisticsError}</AlertDescription>
            </Alert>
          )}

          {statisticsLoading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : statistics ? (
            <>
              <TestStatTiles totals={statistics.totals} />

              <SectionPanel
                title="Question types"
                description="How the catalogue splits by type. Select a slice to filter the list."
              >
                <TestTypeChart
                  counts={statistics.by_type}
                  selected={selectedSlice}
                  onSelect={handleSliceSelect}
                />
              </SectionPanel>

              <SectionPanel
                title="Teachers"
                description="Whose students clear the pass mark most often."
              >
                <TeacherTestLeaderboard
                  teachers={statistics.by_teacher}
                  centerMedian={statistics.center_median}
                  minimumGradedSubmissions={statistics.ranking.minimum_graded_submissions}
                  scope={statistics.scope}
                />
              </SectionPanel>
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          <PageToolbar>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Tabs
                value={tabValue}
                onValueChange={(value) => dispatch(setTestsPageTabValue(value as 'all' | 'active' | 'inactive'))}
              >
                <TabsList>
                  <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                  <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive ({stats.inactive})</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="tests-search"
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => dispatch(setTestsPageSearchTerm(e.target.value))}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={(value) => dispatch(setTestsPageFilterType(value))}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {testTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PageToolbar>

          {filteredTests.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="No tests found"
              description={
                searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first test to get started.'
              }
              action={
                !searchTerm && filterType === 'all' && canCreate ? (
                  <Button onClick={() => navigate('/tests/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create test
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedTests.items.map((test) => (
                <Card
                  key={test.test_id}
                  className="h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/tests/${test.test_id}`)}
                >
                  <div className={cn('h-1', getTestTypeTheme(test.test_type).dot)} />
                  <CardContent className="pt-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className={getTestTypeBadgeClass(test.test_type)}>{formatTestType(test.test_type)}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {test.is_private ? 'Private' : 'Public'}
                        </Badge>
                        <Badge variant={test.is_active ? 'default' : 'secondary'}>
                          {test.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Actions for ${test.test_name}`}
                              className="rounded-md p-1 hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch(setTestsPageSelectedTestId(test.test_id));
                              }}
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tests/${test.test_id}`); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tests/${test.test_id}/edit`); }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit test
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tests/${test.test_id}/results`); }}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              View results
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatch(setTestsPageSelectedTestId(test.test_id));
                                dispatch(setTestsPageDeleteDialogOpen(true));
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete test
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <h3 className="mb-1 text-base font-semibold text-foreground">{test.test_name}</h3>

                    {test.subject_name && <p className="mb-1 text-sm text-primary">{test.subject_name}</p>}

                    {test.description && (
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{test.description}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-4 rounded-md border bg-muted/40 p-3">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {test.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        {test.total_marks} marks
                      </span>
                    </div>

                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span>{test.question_count || 0} questions</span>
                      <span>{test.submission_count || 0} submissions</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredTests.length > 0 && (
            <PaginationBar
              total={filteredTests.length}
              currentPage={paginatedTests.currentPage}
              totalPages={paginatedTests.totalPages}
              start={paginatedTests.start}
              end={paginatedTests.end}
              pageSize={pageSize}
              pageSizeOptions={defaultCardPageSizeOptions}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => dispatch(setTestsPageDeleteDialogOpen(open))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete test</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete "{selectedTest?.test_name}"? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch(setTestsPageDeleteDialogOpen(false))}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestsPage;
