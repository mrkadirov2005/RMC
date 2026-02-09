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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  Tabs,
  Tab,
  Snackbar,
  InputAdornment,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { classAPI, subjectAPI, assignmentAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
}

interface SubjectInfo {
  subject_id: number;
  subject_name: string;
}

interface Assignment {
  assignment_id: number;
  title: string;
  description?: string;
  class_id: number;
  subject_id?: number;
  due_date: string;
  max_score?: number;
  status?: string;
  submission_count?: number;
  created_at?: string;
}

interface TeacherAssignmentsTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherAssignmentsTab = ({ teacherId, onRefresh }: TeacherAssignmentsTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '' as number | '',
    subject_id: '' as number | '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    max_score: 100,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadInitialData();
  }, [teacherId]);

  useEffect(() => {
    loadAssignments();
  }, [selectedClass]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [classRes, subjectRes, assignmentRes] = await Promise.all([
        classAPI.getAll(),
        subjectAPI.getAll(),
        assignmentAPI.getAll(),
      ]);
      setClasses(classRes.data || []);
      setSubjects(subjectRes.data || []);
      setAssignments(assignmentRes.data || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await assignmentAPI.getAll();
      let all = response.data || [];
      if (selectedClass) {
        all = all.filter((a: Assignment) => a.class_id === selectedClass);
      }
      setAssignments(all);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleOpenDialog = (assignment?: Assignment) => {
    if (assignment) {
      setSelectedAssignment(assignment);
      setFormData({
        title: assignment.title,
        description: assignment.description || '',
        class_id: assignment.class_id,
        subject_id: assignment.subject_id || '',
        due_date: assignment.due_date?.split('T')[0] || '',
        max_score: assignment.max_score || 100,
      });
    } else {
      setSelectedAssignment(null);
      setFormData({
        title: '',
        description: '',
        class_id: selectedClass || '',
        subject_id: '',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        max_score: 100,
      });
    }
    setDialogOpen(true);
    setMenuAnchorEl(null);
  };

  const handleSaveAssignment = async () => {
    if (!formData.title || !formData.class_id || !formData.due_date) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      const data = {
        ...formData,
        created_by: teacherId,
      };

      if (selectedAssignment) {
        await assignmentAPI.update(selectedAssignment.assignment_id, data);
        setSnackbar({
          open: true,
          message: 'Assignment updated successfully!',
          severity: 'success',
        });
      } else {
        await assignmentAPI.create(data);
        setSnackbar({
          open: true,
          message: 'Assignment created successfully!',
          severity: 'success',
        });
      }

      setDialogOpen(false);
      loadAssignments();
      onRefresh?.();
    } catch (error) {
      console.error('Error saving assignment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save assignment',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      await assignmentAPI.delete(selectedAssignment.assignment_id);
      setSnackbar({
        open: true,
        message: 'Assignment deleted successfully!',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setSelectedAssignment(null);
      loadAssignments();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete assignment',
        severity: 'error',
      });
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setMenuAnchorEl(event.currentTarget);
  };

  const getAssignmentStatus = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Overdue', color: 'error' as const, icon: <WarningIcon fontSize="small" /> };
    if (diffDays === 0) return { label: 'Due Today', color: 'warning' as const, icon: <ScheduleIcon fontSize="small" /> };
    if (diffDays <= 3) return { label: 'Due Soon', color: 'warning' as const, icon: <ScheduleIcon fontSize="small" /> };
    return { label: 'Active', color: 'success' as const, icon: <CheckCircleIcon fontSize="small" /> };
  };

  const filteredAssignments = assignments.filter(
    (a) =>
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAssignments = filteredAssignments.filter((a) => {
    const due = new Date(a.due_date);
    return due >= new Date();
  });

  const pastAssignments = filteredAssignments.filter((a) => {
    const due = new Date(a.due_date);
    return due < new Date();
  });

  if (loading && classes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Manage Assignments
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Class</InputLabel>
            <Select
              value={selectedClass}
              label="Class"
              onChange={(e) => setSelectedClass(e.target.value as number)}
            >
              <MenuItem value="">All Classes</MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.class_id} value={cls.class_id}>
                  {cls.class_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            New Assignment
          </Button>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#667eea15', textAlign: 'center', p: 2 }}>
            <AssignmentIcon sx={{ fontSize: 32, color: '#667eea' }} />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#667eea' }}>
              {assignments.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Assignments
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#43e97b15', textAlign: 'center', p: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 32, color: '#43e97b' }} />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#43e97b' }}>
              {activeAssignments.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#f5576c15', textAlign: 'center', p: 2 }}>
            <WarningIcon sx={{ fontSize: 32, color: '#f5576c' }} />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#f5576c' }}>
              {pastAssignments.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Past Due
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#2196f315', textAlign: 'center', p: 2 }}>
            <PeopleIcon sx={{ fontSize: 32, color: '#2196f3' }} />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#2196f3' }}>
              {classes.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Classes
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`Active (${activeAssignments.length})`} />
        <Tab label={`Past Due (${pastAssignments.length})`} />
        <Tab label={`All (${filteredAssignments.length})`} />
      </Tabs>

      {/* Assignment Cards */}
      <Grid container spacing={2}>
        {(tabValue === 0 ? activeAssignments : tabValue === 1 ? pastAssignments : filteredAssignments).length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                textAlign: 'center',
                py: 6,
                bgcolor: '#f9f9f9',
                borderRadius: 2,
                border: '2px dashed #e0e0e0',
              }}
            >
              <AssignmentIcon sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No assignments found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {tabValue === 0 ? 'Create a new assignment to get started' : 'No past due assignments'}
              </Typography>
              {tabValue === 0 && (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                  Create Assignment
                </Button>
              )}
            </Box>
          </Grid>
        ) : (
          (tabValue === 0 ? activeAssignments : tabValue === 1 ? pastAssignments : filteredAssignments).map(
            (assignment) => {
              const status = getAssignmentStatus(assignment.due_date);
              const classInfo = classes.find((c) => c.class_id === assignment.class_id);
              const subjectInfo = subjects.find((s) => s.subject_id === assignment.subject_id);

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={assignment.assignment_id}>
                  <Card
                    sx={{
                      height: '100%',
                      '&:hover': { boxShadow: 4 },
                      position: 'relative',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Chip
                          icon={status.icon}
                          label={status.label}
                          size="small"
                          color={status.color}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, assignment)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                        {assignment.title}
                      </Typography>

                      {assignment.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {assignment.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {classInfo && (
                          <Chip
                            label={classInfo.class_name}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {subjectInfo && (
                          <Chip
                            label={subjectInfo.subject_name}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        {assignment.max_score && (
                          <Typography variant="caption" color="text.secondary">
                            Max: {assignment.max_score} pts
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            }
          )
        )}
      </Grid>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem onClick={() => handleOpenDialog(selectedAssignment!)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
            setMenuAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedAssignment ? 'Edit Assignment' : 'Create New Assignment'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Class *</InputLabel>
                <Select
                  value={formData.class_id}
                  label="Class *"
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value as number })}
                >
                  {classes.map((cls) => (
                    <MenuItem key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={formData.subject_id}
                  label="Subject"
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value as number })}
                >
                  <MenuItem value="">None</MenuItem>
                  {subjects.map((subj) => (
                    <MenuItem key={subj.subject_id} value={subj.subject_id}>
                      {subj.subject_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Due Date *"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Max Score"
                value={formData.max_score}
                onChange={(e) =>
                  setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveAssignment}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : selectedAssignment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Assignment</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete "{selectedAssignment?.title}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAssignment}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeacherAssignmentsTab;
