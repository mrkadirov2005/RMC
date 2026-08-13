// Page component for the tests screen in the crm feature.

import { useEffect, useMemo, useState } from 'react';
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
  Sparkles,
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
import {
  formatTestType,
  getTestTypeBadgeClass,
  getTestTypeTheme,
  testStatCardClass,
  testSurfaceClass,
} from './testVisuals';
import { TEST_TYPES } from './questionTypes';
import { PaginationBar, defaultCardPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';

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

// Renders the tests page screen.
const TestsPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
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

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchTests());
  }, [dispatch]);

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

  const testTypes = [
    { value: 'all', label: 'All Types' },
    ...TEST_TYPES.map((type) => ({ value: type as string, label: formatTestType(type) })),
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/60 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-80 bg-gradient-to-l from-fuchsia-100/45 via-amber-100/35 to-transparent dark:hidden" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-foreground">Tests Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create, assign, monitor, and grade student assessments.
              </p>
            </div>
          </div>
          {(user?.userType === 'superuser' || user?.userType === 'teacher') && (
            <Button
              onClick={() => navigate('/tests/create')}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-white hover:from-indigo-600 hover:to-purple-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Test
            </Button>
          )}
        </div>
      </div>

      {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription className="flex justify-between items-center">
            {getErrorMessage(error)}
            <button
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className={cn(testStatCardClass, 'border-indigo-100 dark:border-border')}>
          <CardContent className="pt-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-muted dark:text-muted-foreground">
              <FileQuestion className="h-5 w-5" />
            </div>
            <p className="text-4xl font-bold text-indigo-700 dark:text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Tests</p>
          </CardContent>
        </Card>
        <Card className={cn(testStatCardClass, 'border-emerald-100 dark:border-border')}>
          <CardContent className="pt-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-muted dark:text-muted-foreground">
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className="text-4xl font-bold text-emerald-700 dark:text-green-500">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active Tests</p>
          </CardContent>
        </Card>
        <Card className={cn(testStatCardClass, 'border-slate-200 dark:border-border')}>
          <CardContent className="pt-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-muted dark:text-muted-foreground">
              <X className="h-5 w-5" />
            </div>
            <p className="text-4xl font-bold text-slate-700 dark:text-muted-foreground">{stats.inactive}</p>
            <p className="text-sm text-muted-foreground">Inactive Tests</p>
          </CardContent>
        </Card>
        <Card className={cn(testStatCardClass, 'border-sky-100 dark:border-border')}>
          <CardContent className="pt-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-muted dark:text-muted-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-4xl font-bold text-sky-700 dark:text-blue-500">{stats.totalSubmissions}</p>
            <p className="text-sm text-muted-foreground">Total Submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className={testSurfaceClass}>
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <Tabs value={tabValue} onValueChange={(value) => dispatch(setTestsPageTabValue(value as 'all' | 'active' | 'inactive'))}>
          <div className="border-b bg-gradient-to-r from-sky-50/80 via-white to-emerald-50/70 dark:bg-none">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                All Tests ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                Active ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                Inactive ({stats.inactive})
              </TabsTrigger>
            </TabsList>
          </div>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => dispatch(setTestsPageSearchTerm(e.target.value))}
                  className="pl-9"
                />
              </div>
              <div className="md:col-span-3">
                <Select value={filterType} onValueChange={(value) => dispatch(setTestsPageFilterType(value))}>
                  <SelectTrigger>
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
          </CardContent>
        </Tabs>
      </Card>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/70 py-16 text-center dark:border-border dark:bg-muted/30 dark:bg-none">
          <FileQuestion className="mx-auto mb-4 h-16 w-16 text-indigo-300 dark:text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-muted-foreground">No tests found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first test to get started'}
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button
              onClick={() => navigate('/tests/create')}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          )}
        </div>
      ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {paginatedTests.items.map((test) => (
              <Card
                key={test.test_id}
                className={cn(
                  'h-full cursor-pointer overflow-hidden border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card dark:hover:shadow-sm',
                  getTestTypeTheme(test.test_type).panel,
                  'dark:bg-none'
                )}
                onClick={() => navigate(`/tests/${test.test_id}`)}
              >
                <div className={cn('h-1', getTestTypeTheme(test.test_type).dot)} />
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={getTestTypeBadgeClass(test.test_type)}
                    >
                      {formatTestType(test.test_type)}
                    </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        test.is_private ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                      )}
                    >
                      {test.is_private ? 'Private' : 'Public'}
                    </Badge>
                    <Badge variant={test.is_active ? 'default' : 'secondary'} className={cn(test.is_active && 'bg-green-100 text-green-800 border-green-300')}>
                      {test.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 rounded-md hover:bg-muted"
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
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tests/${test.test_id}/edit`); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Test
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tests/${test.test_id}/results`); }}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Results
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            dispatch(setTestsPageSelectedTestId(test.test_id));
                            dispatch(setTestsPageDeleteDialogOpen(true));
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Test
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <h3 className="mb-1 text-lg font-semibold text-slate-950 dark:text-foreground">{test.test_name}</h3>

                {test.subject_name && (
                  <p className="text-sm text-primary mb-1">{test.subject_name}</p>
                )}

                {test.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {test.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-white/70 bg-white/65 p-3 dark:border-border dark:bg-muted/20">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{test.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{test.total_marks} marks</span>
                  </div>
                </div>

                <div className="mt-3 flex gap-4">
                  <span className="text-xs text-muted-foreground">
                    {test.question_count || 0} questions
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {test.submission_count || 0} submissions
                  </span>
                  {Number(test.submission_count || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-primary">
                      <Sparkles className="h-3 w-3" />
                      Has activity
                    </span>
                  )}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => dispatch(setTestsPageDeleteDialogOpen(open))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{selectedTest?.test_name}"? This action cannot be undone.
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
