// Tests section: the four headline figures, the English level tests (Beginner to C1), and every test
// as a row with how it went (a pass line; hover for the numbers). A click opens the test; the menu
// edits, shows results or deletes. The teachers' ranking sits at the bottom.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Clock,
  FileQuestion,
  Loader2,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/utils/errorMessage';
import { useLanguage } from '@/i18n/LanguageContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import { EmptyState } from '@/components/common/EmptyState';
import { PaginationBar, paginateItems } from '@/components/common/PaginationBar';
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
  selectTestsItems,
  selectTestsLoading,
  selectTestsStats,
} from '../../../store/selectors';
import { formatTestType, getTestTypeBadgeClass } from './testVisuals';
import { TEST_TYPES } from './questionTypes';
import { testStatisticsApi, type TestStatistics } from './api/testStatisticsApi';
import { TestStatTiles } from './components/TestStatTiles';
import { TeacherTestLeaderboard } from './components/TeacherTestLeaderboard';
import { LevelTestShelf } from './components/LevelTestShelf';
import { PassRateLine } from './components/PassRateLine';

interface TestRow {
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
  awaiting_grading_count?: number;
  graded_count?: number;
  passed_count?: number;
  average_percentage?: number | null;
  subject_name?: string;
  test_data?: { level_test?: { level?: string } } | null;
}

type Kind = 'all' | 'level' | 'own';

const levelOf = (test: TestRow) => test.test_data?.level_test?.level || null;

const TestsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [kind, setKind] = useState<Kind>('all');
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const { user } = useAppSelector((state) => state.auth);
  const loading = useAppSelector(selectTestsLoading);
  const testsError = useAppSelector(selectTestsError);
  const stats = useAppSelector(selectTestsStats);
  const { pageError, tabValue, searchTerm, filterType, deleteDialogOpen } = useAppSelector(selectTestsPageUi);
  const selectFilteredTests = useMemo(makeSelectFilteredTestsForPageUi, []);
  const filteredTests = useAppSelector((state) => selectFilteredTests(state)) as TestRow[];
  const allTests = useAppSelector(selectTestsItems) as TestRow[];
  const selectedTest = useAppSelector(selectTestsPageSelectedTest) as TestRow | null;
  const error = pageError || testsError;
  const canCreate = user?.userType === 'superuser' || user?.userType === 'teacher';
  const canInstall = user?.userType === 'superuser';

  const reload = () => {
    dispatch(fetchTests());
    testStatisticsApi.get().then(setStatistics).catch(() => setStatistics(null));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tabValue, searchTerm, filterType, kind]);

  const visibleTests = useMemo(
    () => filteredTests.filter((test) => kind === 'all' || (kind === 'level' ? Boolean(levelOf(test)) : !levelOf(test))),
    [filteredTests, kind]
  );
  const paginated = useMemo(() => paginateItems(visibleTests, page, pageSize), [visibleTests, page, pageSize]);
  const statsByTestId = useMemo(() => new Map(allTests.map((test) => [Number(test.test_id), test])), [allTests]);

  const handleDelete = async () => {
    if (!selectedTest) return;
    try {
      await dispatch(deleteTest(selectedTest.test_id)).unwrap();
      dispatch(setTestsPageDeleteDialogOpen(false));
      dispatch(setTestsPageSelectedTestId(null));
    } catch (err: any) {
      dispatch(setTestsPageError(err?.message || 'Failed to delete test.'));
    }
  };

  const kinds: { id: Kind; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'level', label: 'Level tests' },
    { id: 'own', label: 'Own tests' },
  ];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title={t('Tests')}
        icon={ClipboardList}
        description={t('Create, assign, monitor and grade student assessments.')}
        primaryAction={
          canCreate ? (
            <Button onClick={() => navigate('/tests/create')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Create test')}
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
              aria-label={t('Close')}
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

      {statistics && <TestStatTiles totals={statistics.totals} />}

      <LevelTestShelf statsByTestId={statsByTestId} canInstall={canInstall} onInstalled={reload} />

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="tablist">
              {kinds.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={kind === item.id}
                  onClick={() => setKind(item.id)}
                  className={cn('rounded-md px-3 py-1.5 text-sm font-semibold', kind === item.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                >
                  {t(item.label)}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="tablist">
              {(
                [
                  ['all', t('Any status'), stats.total],
                  ['active', t('Active'), stats.active],
                  ['inactive', t('Inactive'), stats.inactive],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tabValue === value}
                  onClick={() => dispatch(setTestsPageTabValue(value))}
                  className={cn('rounded-md px-3 py-1.5 text-sm font-semibold', tabValue === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                >
                  {label} <span className="tabular-nums opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="tests-search"
                placeholder={t('Search tests...')}
                value={searchTerm}
                onChange={(event) => dispatch(setTestsPageSearchTerm(event.target.value))}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(value) => dispatch(setTestsPageFilterType(value))}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder={t('All question types')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All question types')}</SelectItem>
                {TEST_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(formatTestType(type))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Column titles (wide screens; rows stack on a phone). */}
        <div className="hidden grid-cols-[minmax(220px,2fr)_150px_minmax(180px,1.4fr)_110px_32px] gap-4 border-b px-4 py-2 text-[0.6875rem] font-bold uppercase tracking-wide text-muted-foreground lg:grid">
          <span>{t('Test')}</span>
          <span>{t('Size')}</span>
          <span>{t('Results')}</span>
          <span>{t('Status')}</span>
          <span />
        </div>

        {loading && !allTests.length ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : visibleTests.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={FileQuestion}
              title={t('No tests found')}
              description={searchTerm || filterType !== 'all' || kind !== 'all' ? t('Try adjusting your search or filters.') : t('Create your first test to get started.')}
              action={
                !searchTerm && filterType === 'all' && canCreate ? (
                  <Button onClick={() => navigate('/tests/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('Create test')}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="divide-y">
            {paginated.items.map((test) => {
              const level = levelOf(test);
              return (
                <div
                  key={test.test_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/tests/${test.test_id}`)}
                  onKeyDown={(event) => event.key === 'Enter' && navigate(`/tests/${test.test_id}`)}
                  className="relative grid cursor-pointer grid-cols-1 items-center gap-x-4 gap-y-2 px-4 py-3 pr-12 transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(220px,2fr)_150px_minmax(180px,1.4fr)_110px_32px] lg:pr-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{test.test_name}</span>
                      {test.is_private && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label={t('Private')} />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {level ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.6875rem] font-bold text-primary">{t('Level {level}', { level })}</span>
                      ) : (
                        <span className={getTestTypeBadgeClass(test.test_type)}>{t(formatTestType(test.test_type))}</span>
                      )}
                      {test.subject_name && <span className="text-xs text-muted-foreground">{test.subject_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="tabular-nums">{t('{count} questions', { count: test.question_count || 0 })}</span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="h-3.5 w-3.5" />
                      {t('{minutes} min', { minutes: test.duration_minutes })}
                    </span>
                  </div>
                  <PassRateLine stats={test} />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        test.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {test.is_active ? t('Active') : t('Inactive')}
                    </span>
                    {Number(test.awaiting_grading_count) > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        {t('{count} to grade', { count: test.awaiting_grading_count || 0 })}
                      </span>
                    )}
                  </div>
                  {/* Top-right corner on a phone, its own column on a wide screen. */}
                  <div className="absolute right-2 top-2 flex items-center justify-end gap-1 lg:static" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t('Actions')}
                          className="rounded-md p-1.5 hover:bg-muted"
                          onClick={() => dispatch(setTestsPageSelectedTestId(test.test_id))}
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/tests/${test.test_id}/results`)}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          {t('View results')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/tests/${test.test_id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('Edit test')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            dispatch(setTestsPageSelectedTestId(test.test_id));
                            dispatch(setTestsPageDeleteDialogOpen(true));
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('Delete test')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="hidden h-4 w-4 text-muted-foreground lg:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {visibleTests.length > 0 && (
          <div className="border-t p-3">
            <PaginationBar
              total={visibleTests.length}
              currentPage={paginated.currentPage}
              totalPages={paginated.totalPages}
              start={paginated.start}
              end={paginated.end}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>

      {statistics && (
        <SectionPanel title={t('Teachers')} description={t('Whose students clear the pass mark most often.')}>
          <TeacherTestLeaderboard
            teachers={statistics.by_teacher}
            centerMedian={statistics.center_median}
            minimumGradedSubmissions={statistics.ranking.minimum_graded_submissions}
            scope={statistics.scope}
          />
        </SectionPanel>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => dispatch(setTestsPageDeleteDialogOpen(open))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete test')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('Delete "{name}"? This cannot be undone.', { name: selectedTest?.test_name || '' })}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch(setTestsPageDeleteDialogOpen(false))}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestsPage;
