import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Grid,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  TextField,
  Tabs,
  Tab,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import {
  GradeOutlined as GradeIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { classAPI, studentAPI, gradeAPI, subjectAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
}

interface SubjectInfo {
  subject_id: number;
  subject_name: string;
}

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  class_id?: number;
}

interface GradeRecord {
  grade_id?: number;
  student_id: number;
  subject_id: number;
  grade_type: string;
  grade_value: number;
  max_value: number;
  grade_date: string;
  notes?: string;
}

interface TeacherGradesTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherGradesTab = ({ teacherId, onRefresh }: TeacherGradesTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newGrade, setNewGrade] = useState({
    grade_type: 'Assignment',
    grade_value: 0,
    max_value: 100,
    notes: '',
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
    if (selectedClass) {
      loadStudentsAndGrades();
    }
  }, [selectedClass, selectedSubject]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [classRes, subjectRes] = await Promise.all([
        classAPI.getAll(),
        subjectAPI.getAll(),
      ]);
      setClasses(classRes.data || []);
      setSubjects(subjectRes.data || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndGrades = async () => {
    try {
      setLoading(true);
      const [studentsRes, gradesRes] = await Promise.all([
        studentAPI.getAll(),
        gradeAPI.getAll(),
      ]);

      // Filter students by class
      const filteredStudents = (studentsRes.data || []).filter(
        (s: Student) => !selectedClass || s.class_id === selectedClass
      );
      setStudents(filteredStudents);

      // Filter grades
      const filteredGrades = (gradesRes.data || []).filter((g: GradeRecord) => {
        const studentIds = filteredStudents.map((s: Student) => s.student_id);
        return (
          studentIds.includes(g.student_id) &&
          (!selectedSubject || g.subject_id === selectedSubject)
        );
      });
      setGrades(filteredGrades);
    } catch (error) {
      console.error('Error loading students/grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGradeDialog = (student: Student) => {
    setSelectedStudent(student);
    setNewGrade({
      grade_type: 'Assignment',
      grade_value: 0,
      max_value: 100,
      notes: '',
    });
    setGradeDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedStudent || !selectedSubject) {
      setSnackbar({
        open: true,
        message: 'Please select a subject first',
        severity: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      await gradeAPI.create({
        student_id: selectedStudent.student_id,
        subject_id: selectedSubject,
        grade_type: newGrade.grade_type,
        grade_value: newGrade.grade_value,
        max_value: newGrade.max_value,
        grade_date: new Date().toISOString().split('T')[0],
        notes: newGrade.notes,
        recorded_by: teacherId,
      });

      setSnackbar({
        open: true,
        message: 'Grade saved successfully!',
        severity: 'success',
      });
      setGradeDialogOpen(false);
      loadStudentsAndGrades();
      onRefresh?.();
    } catch (error) {
      console.error('Error saving grade:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save grade',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateStudentAverage = (studentId: number) => {
    const studentGrades = grades.filter((g) => g.student_id === studentId);
    if (studentGrades.length === 0) return null;

    const totalPercentage = studentGrades.reduce((acc, g) => {
      return acc + (g.grade_value / g.max_value) * 100;
    }, 0);

    return (totalPercentage / studentGrades.length).toFixed(1);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return '#43e97b';
    if (percentage >= 80) return '#2196f3';
    if (percentage >= 70) return '#667eea';
    if (percentage >= 60) return '#ff9800';
    return '#f5576c';
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const filteredStudents = students.filter(
    (s) =>
      s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.enrollment_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const gradeTypes = ['Assignment', 'Quiz', 'Test', 'Exam', 'Project', 'Homework', 'Participation'];

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
          Manage Grades
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search students..."
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Subject</InputLabel>
            <Select
              value={selectedSubject}
              label="Subject"
              onChange={(e) => setSelectedSubject(e.target.value as number)}
            >
              <MenuItem value="">All Subjects</MenuItem>
              {subjects.map((subj) => (
                <MenuItem key={subj.subject_id} value={subj.subject_id}>
                  {subj.subject_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#667eea15', textAlign: 'center', p: 2 }}>
            <GradeIcon sx={{ fontSize: 32, color: '#667eea' }} />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#667eea' }}>
              {grades.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Grades
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#43e97b15', textAlign: 'center', p: 2 }}>
            <TrendingUpIcon sx={{ fontSize: 32, color: '#43e97b' }} />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#43e97b' }}>
              {grades.length > 0
                ? (
                    grades.reduce((acc, g) => acc + (g.grade_value / g.max_value) * 100, 0) /
                    grades.length
                  ).toFixed(0)
                : 0}
              %
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Class Average
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#2196f315', textAlign: 'center', p: 2 }}>
            <AssessmentIcon sx={{ fontSize: 32, color: '#2196f3' }} />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#2196f3' }}>
              {students.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Students
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#ff980015', textAlign: 'center', p: 2 }}>
            <FilterIcon sx={{ fontSize: 32, color: '#ff9800' }} />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#ff9800' }}>
              {new Set(grades.map((g) => g.grade_type)).size}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Grade Types
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Student Grades" />
        <Tab label="Recent Activity" />
      </Tabs>

      {tabValue === 0 && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>Student</TableCell>
                <TableCell>Enrollment #</TableCell>
                <TableCell align="center">Grades Count</TableCell>
                <TableCell align="center">Average</TableCell>
                <TableCell align="center">Letter Grade</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {selectedClass ? 'No students found' : 'Select a class to view students'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => {
                  const avgStr = calculateStudentAverage(student.student_id);
                  const avg = avgStr ? parseFloat(avgStr) : null;
                  const studentGradeCount = grades.filter(
                    (g) => g.student_id === student.student_id
                  ).length;

                  return (
                    <TableRow key={student.student_id} sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: '#667eea', width: 32, height: 32, fontSize: 14 }}>
                            {student.first_name?.[0]}
                            {student.last_name?.[0]}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {student.first_name} {student.last_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {student.enrollment_number}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={studentGradeCount}
                          size="small"
                          color={studentGradeCount > 0 ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {avg !== null ? (
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: getGradeColor(avg) }}
                          >
                            {avg}%
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {avg !== null ? (
                          <Chip
                            label={getLetterGrade(avg)}
                            size="small"
                            sx={{
                              bgcolor: getGradeColor(avg) + '20',
                              color: getGradeColor(avg),
                              fontWeight: 700,
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Add Grade">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenGradeDialog(student)}
                          >
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 1 && (
        <Box sx={{ py: 2 }}>
          {grades.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <GradeIcon sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
              <Typography color="text.secondary">No grades recorded yet</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {grades.slice(0, 10).map((grade, idx) => {
                const student = students.find((s) => s.student_id === grade.student_id);
                const subject = subjects.find((s) => s.subject_id === grade.subject_id);
                const percentage = (grade.grade_value / grade.max_value) * 100;

                return (
                  <Grid size={{ xs: 12, md: 6 }} key={grade.grade_id || idx}>
                    <Card sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Avatar sx={{ bgcolor: getGradeColor(percentage), width: 40, height: 40 }}>
                            {getLetterGrade(percentage)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {student
                                ? `${student.first_name} ${student.last_name}`
                                : `Student #${grade.student_id}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {subject?.subject_name || `Subject #${grade.subject_id}`} • {grade.grade_type}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: getGradeColor(percentage) }}>
                            {grade.grade_value}/{grade.max_value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {percentage.toFixed(0)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* Add Grade Dialog */}
      <Dialog open={gradeDialogOpen} onClose={() => setGradeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Grade for {selectedStudent?.first_name} {selectedStudent?.last_name}
        </DialogTitle>
        <DialogContent dividers>
          {!selectedSubject && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please select a subject from the filters above before adding a grade
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Grade Type</InputLabel>
                <Select
                  value={newGrade.grade_type}
                  label="Grade Type"
                  onChange={(e) =>
                    setNewGrade({ ...newGrade, grade_type: e.target.value })
                  }
                >
                  {gradeTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Score"
                type="number"
                value={newGrade.grade_value}
                onChange={(e) =>
                  setNewGrade({
                    ...newGrade,
                    grade_value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Max Score"
                type="number"
                value={newGrade.max_value}
                onChange={(e) =>
                  setNewGrade({
                    ...newGrade,
                    max_value: parseFloat(e.target.value) || 100,
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Notes (optional)"
                multiline
                rows={2}
                value={newGrade.notes}
                onChange={(e) => setNewGrade({ ...newGrade, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGradeDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveGrade}
            disabled={saving || !selectedSubject}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Grade'}
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

export default TeacherGradesTab;
