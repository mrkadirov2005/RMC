import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Badge,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Quiz as QuizIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignIcon,
  Visibility as ViewIcon,
  Grade as GradeIcon,
  Search as SearchIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { testAPI } from '../../../shared/api/api';
import { useNavigate } from 'react-router-dom';

interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  description?: string;
  total_marks: number;
  duration_minutes: number;
  is_active: boolean;
  question_count?: number;
  submission_count?: number;
  subject_name?: string;
  created_at?: string;
}

interface Submission {
  submission_id: number;
  student_name: string;
  student_id: number;
  status: string;
  score: number;
  total_marks: number;
  submitted_at: string;
  graded_at?: string;
}

interface TeacherTestsTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherTestsTab = ({ teacherId, onRefresh }: TeacherTestsTabProps) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [submissionsDialog, setSubmissionsDialog] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  useEffect(() => {
    loadTests();
  }, [teacherId]);

  useEffect(() => {
    filterTests();
  }, [tests, searchTerm, filterTab]);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await testAPI.getAll();
      setTests(response.data || []);
    } catch (err: any) {
      console.error('Error loading tests:', err);
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const filterTests = () => {
    let filtered = [...tests];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.test_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply tab filter
    switch (filterTab) {
      case 1: // Active
        filtered = filtered.filter((t) => t.is_active);
        break;
      case 2: // Inactive
        filtered = filtered.filter((t) => !t.is_active);
        break;
      case 3: // With Submissions
        filtered = filtered.filter((t) => (t.submission_count || 0) > 0);
        break;
      default:
        break;
    }

    setFilteredTests(filtered);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, test: Test) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTest(test);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewSubmissions = async () => {
    handleMenuClose();
    if (!selectedTest) return;

    try {
      setSubmissionsLoading(true);
      setSubmissionsDialog(true);
      const response = await testAPI.getSubmissionsByTest(selectedTest.test_id);
      setSubmissions(response.data || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!selectedTest) return;

    try {
      await testAPI.delete(selectedTest.test_id);
      loadTests();
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting test:', err);
    } finally {
      setDeleteDialog(false);
      handleMenuClose();
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'graded':
        return 'success';
      case 'submitted':
        return 'warning';
      case 'in_progress':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Create Button and Search */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          My Tests ({filteredTests.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
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
            sx={{ minWidth: 250 }}
          />
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
        </Box>
      </Box>

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={filterTab}
          onChange={(_, v) => setFilterTab(v)}
          sx={{ '& .MuiTab-root': { textTransform: 'none' } }}
        >
          <Tab label={`All (${tests.length})`} />
          <Tab label={`Active (${tests.filter((t) => t.is_active).length})`} />
          <Tab label={`Inactive (${tests.filter((t) => !t.is_active).length})`} />
          <Tab
            label={
              <Badge
                badgeContent={tests.filter((t) => (t.submission_count || 0) > 0).length}
                color="primary"
              >
                With Submissions
              </Badge>
            }
          />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
            {searchTerm ? 'Try adjusting your search' : 'Create your first test to get started'}
          </Typography>
          {!searchTerm && (
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
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/tests/${test.test_id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={formatTestType(test.test_type)}
                        size="small"
                        sx={{
                          bgcolor: getTestTypeColor(test.test_type),
                          color: 'white',
                        }}
                      />
                      {test.subject_name && (
                        <Chip label={test.subject_name} size="small" variant="outlined" />
                      )}
                    </Box>
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

                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
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

                  <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {test.question_count || 0} questions
                    </Typography>
                    <Badge
                      badgeContent={test.submission_count || 0}
                      color="primary"
                      max={99}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ pr: 1 }}>
                        submissions
                      </Typography>
                    </Badge>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Test Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/tests/${selectedTest?.test_id}`); }}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/tests/${selectedTest?.test_id}/edit`); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Test</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/tests/${selectedTest?.test_id}/assign`); }}>
          <ListItemIcon><AssignIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Assign Test</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleViewSubmissions}>
          <ListItemIcon>
            <Badge badgeContent={selectedTest?.submission_count || 0} color="primary">
              <PeopleIcon fontSize="small" />
            </Badge>
          </ListItemIcon>
          <ListItemText>View Submissions</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setDeleteDialog(true); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete Test</ListItemText>
        </MenuItem>
      </Menu>

      {/* Submissions Dialog */}
      <Dialog
        open={submissionsDialog}
        onClose={() => setSubmissionsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Test Submissions - {selectedTest?.test_name}</Typography>
            <Chip label={`${submissions.length} submissions`} size="small" color="primary" />
          </Box>
        </DialogTitle>
        <DialogContent>
          {submissionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : submissions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No submissions yet</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell>Student</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Submitted At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.submission_id}>
                      <TableCell>{sub.student_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={sub.status}
                          size="small"
                          color={getStatusColor(sub.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        {sub.score !== null ? `${sub.score}/${sub.total_marks}` : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Submission">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/tests/submissions/${sub.submission_id}`)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {sub.status !== 'graded' && (
                          <Tooltip title="Grade Submission">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => navigate(`/tests/submissions/${sub.submission_id}/grade`)}
                            >
                              <GradeIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmissionsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Test</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedTest?.test_name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteTest} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherTestsTab;
