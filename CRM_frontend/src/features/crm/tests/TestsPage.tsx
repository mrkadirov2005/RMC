import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Tab,
  Tabs,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assessment as ResultsIcon,
  Quiz as QuizIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { testAPI } from '../../../shared/api/api';
import { useAppSelector } from '../hooks';

interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  description?: string;
  total_marks: number;
  passing_marks: number;
  duration_minutes: number;
  is_active: boolean;
  question_count?: number;
  submission_count?: number;
  subject_name?: string;
  created_at?: string;
}


const TestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await testAPI.getAll();
      setTests(response.data || []);
    } catch (err: any) {
      console.error('Error loading tests:', err);
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, test: Test) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTest(test);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    if (selectedTest) {
      try {
        await testAPI.delete(selectedTest.test_id);
        setTests(tests.filter((t) => t.test_id !== selectedTest.test_id));
        setDeleteDialogOpen(false);
        setSelectedTest(null);
      } catch (err) {
        console.error('Error deleting test:', err);
      }
    }
  };

  const getTestTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      multiple_choice: '#667eea',
      essay: '#f5576c',
      short_answer: '#4facfe',
      true_false: '#43e97b',
      form_filling: '#fa709a',
      reading_passage: '#a855f7',
      writing: '#ec4899',
      matching: '#14b8a6',
    };
    return colors[type] || '#6b7280';
  };

  const formatTestType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      test.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || test.test_type === filterType;
    const matchesTab =
      tabValue === 0 || // All tests
      (tabValue === 1 && test.is_active) || // Active
      (tabValue === 2 && !test.is_active); // Inactive

    return matchesSearch && matchesType && matchesTab;
  });

  const testTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'essay', label: 'Essay' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'true_false', label: 'True/False' },
    { value: 'form_filling', label: 'Form Filling' },
    { value: 'reading_passage', label: 'Reading Passage' },
    { value: 'writing', label: 'Writing' },
    { value: 'matching', label: 'Matching' },
  ];

  const stats = {
    total: tests.length,
    active: tests.filter((t) => t.is_active).length,
    inactive: tests.filter((t) => !t.is_active).length,
    totalSubmissions: tests.reduce((sum, t) => sum + (t.submission_count || 0), 0),
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Tests Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create, manage, and grade tests for your students
          </Typography>
        </Box>
        {(user?.userType === 'superuser' || user?.userType === 'teacher') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tests/create')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              px: 3,
              py: 1.5,
            }}
          >
            Create New Test
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="success.main">
                {stats.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="text.secondary">
                {stats.inactive}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inactive Tests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={700} color="info.main">
                {stats.totalSubmissions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Submissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`All Tests (${stats.total})`} />
            <Tab label={`Active (${stats.active})`} />
            <Tab label={`Inactive (${stats.inactive})`} />
          </Tabs>
        </Box>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder="Search tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Test Type</InputLabel>
                <Select
                  value={filterType}
                  label="Test Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  {testTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            bgcolor: '#f9f9f9',
            borderRadius: 2,
            border: '2px dashed #e0e0e0',
          }}
        >
          <QuizIcon sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No tests found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first test to get started'}
          </Typography>
          {!searchTerm && filterType === 'all' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/tests/create')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
              }}
            >
              Create Test
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredTests.map((test) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={test.test_id}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
                onClick={() => navigate(`/tests/${test.test_id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Chip
                      label={formatTestType(test.test_type)}
                      size="small"
                      sx={{
                        bgcolor: getTestTypeColor(test.test_type),
                        color: 'white',
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={test.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={test.is_active ? 'success' : 'default'}
                        variant="outlined"
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, test)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                    {test.test_name}
                  </Typography>

                  {test.subject_name && (
                    <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                      {test.subject_name}
                    </Typography>
                  )}

                  {test.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {test.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimerIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {test.duration_minutes} min
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {test.total_marks} marks
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {test.question_count || 0} questions
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {test.submission_count || 0} submissions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            navigate(`/tests/${selectedTest?.test_id}`);
            handleMenuClose();
          }}
        >
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/tests/${selectedTest?.test_id}/edit`);
            handleMenuClose();
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Test
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/tests/${selectedTest?.test_id}/results`);
            handleMenuClose();
          }}
        >
          <ResultsIcon fontSize="small" sx={{ mr: 1 }} />
          View Results
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Test
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Test</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedTest?.test_name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TestsPage;
