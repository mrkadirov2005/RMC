import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
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
  Button,
  Grid,
  Card,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  MoreVert as MoreIcon,
  Grade as GradeIcon,
  EventNote as AttendanceIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { studentAPI, gradeAPI, attendanceAPI, testAPI } from '../../../shared/api/api';
import { useNavigate } from 'react-router-dom';

interface Student {
  student_id: number;
  center_id?: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  enrollment_number: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_phone?: string;
  gender?: string;
  status: string;
  teacher_id?: number;
  class_id?: number;
  class_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface StudentDetails {
  grades: any[];
  attendance: any[];
  testResults: any[];
  assignments: any[];
}

interface TeacherStudentsTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherStudentsTab = ({ teacherId, onRefresh: _onRefresh }: TeacherStudentsTabProps) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [detailsTab, setDetailsTab] = useState(0);
  const [studentDetails, setStudentDetails] = useState<StudentDetails>({
    grades: [],
    attendance: [],
    testResults: [],
    assignments: [],
  });
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [teacherId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(
        (s) =>
          s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getAll();
      const allStudents = response.data || [];
      setStudents(allStudents);
      setFilteredStudents(allStudents);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (student: Student) => {
    try {
      setDetailsLoading(true);
      const [gradesRes, attendanceRes, testsRes] = await Promise.all([
        gradeAPI.getByStudent(student.student_id).catch(() => ({ data: [] })),
        attendanceAPI.getByStudent(student.student_id).catch(() => ({ data: [] })),
        testAPI.getStudentResults(student.student_id).catch(() => ({ data: [] })),
      ]);

      setStudentDetails({
        grades: gradesRes.data || [],
        attendance: attendanceRes.data || [],
        testResults: testsRes.data || [],
        assignments: [],
      });
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, student: Student) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    handleMenuClose();
    if (selectedStudent) {
      setDetailsDialog(true);
      setDetailsTab(0);
      loadStudentDetails(selectedStudent);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'graduated':
        return 'info';
      default:
        return 'default';
    }
  };

  const calculateAttendancePercentage = () => {
    if (studentDetails.attendance.length === 0) return 0;
    const present = studentDetails.attendance.filter(
      (a) => a.status === 'Present' || a.status === 'Late'
    ).length;
    return Math.round((present / studentDetails.attendance.length) * 100);
  };

  const calculateAverageGrade = () => {
    if (studentDetails.grades.length === 0) return 0;
    const total = studentDetails.grades.reduce((sum, g) => sum + (g.percentage || 0), 0);
    return Math.round(total / studentDetails.grades.length);
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
      {/* Search Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          My Students ({filteredStudents.length})
        </Typography>
        <TextField
          placeholder="Search students by name, email, or enrollment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 350 }}
        />
      </Box>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No students found
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>Student</TableCell>
                <TableCell>Enrollment #</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow
                  key={student.student_id}
                  sx={{
                    '&:hover': { bgcolor: '#f9f9f9' },
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedStudent(student);
                    handleViewDetails();
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: '#667eea' }}>
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {student.first_name} {student.last_name}
                        </Typography>
                        {student.email && (
                          <Typography variant="caption" color="text.secondary">
                            {student.email}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {student.enrollment_number}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={student.class_name || 'Unassigned'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {student.email && (
                        <Tooltip title={student.email}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `mailto:${student.email}`;
                            }}
                          >
                            <EmailIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {student.phone && (
                        <Tooltip title={student.phone}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${student.phone}`;
                            }}
                          >
                            <PhoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={student.status || 'Active'}
                      size="small"
                      color={getStatusColor(student.status) as any}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, student)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredStudents.length} of {students.length} students
        </Typography>
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/student/${selectedStudent?.student_id}`); }}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Full Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setDetailsDialog(true); setDetailsTab(1); loadStudentDetails(selectedStudent!); }}>
          <ListItemIcon><GradeIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Grades</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setDetailsDialog(true); setDetailsTab(2); loadStudentDetails(selectedStudent!); }}>
          <ListItemIcon><AttendanceIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Attendance</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setDetailsDialog(true); setDetailsTab(3); loadStudentDetails(selectedStudent!); }}>
          <ListItemIcon><QuizIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Test Results</ListItemText>
        </MenuItem>
      </Menu>

      {/* Student Details Dialog */}
      <Dialog
        open={detailsDialog}
        onClose={() => setDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#667eea', width: 56, height: 56 }}>
              {selectedStudent?.first_name?.[0]}{selectedStudent?.last_name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedStudent?.first_name} {selectedStudent?.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedStudent?.enrollment_number}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Quick Stats */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card sx={{ bgcolor: '#667eea15', textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" color="primary" fontWeight={700}>
                      {calculateAverageGrade()}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg. Grade
                    </Typography>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card sx={{ bgcolor: '#43e97b15', textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ color: '#43e97b' }} fontWeight={700}>
                      {calculateAttendancePercentage()}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Attendance
                    </Typography>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card sx={{ bgcolor: '#f5576c15', textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ color: '#f5576c' }} fontWeight={700}>
                      {studentDetails.testResults.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tests Taken
                    </Typography>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card sx={{ bgcolor: '#4facfe15', textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ color: '#4facfe' }} fontWeight={700}>
                      {studentDetails.grades.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Grades
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Tabs */}
              <Tabs
                value={detailsTab}
                onChange={(_, v) => setDetailsTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab icon={<TrendingUpIcon />} iconPosition="start" label="Overview" />
                <Tab icon={<GradeIcon />} iconPosition="start" label="Grades" />
                <Tab icon={<AttendanceIcon />} iconPosition="start" label="Attendance" />
                <Tab icon={<QuizIcon />} iconPosition="start" label="Test Results" />
              </Tabs>

              {/* Overview Tab */}
              {detailsTab === 0 && (
                <Box>
                  {/* Personal Information */}
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Personal Information
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography variant="body2">{selectedStudent?.email || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">Phone</Typography>
                      <Typography variant="body2">{selectedStudent?.phone || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">Date of Birth</Typography>
                      <Typography variant="body2">
                        {selectedStudent?.date_of_birth 
                          ? new Date(selectedStudent.date_of_birth).toLocaleDateString() 
                          : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">Gender</Typography>
                      <Typography variant="body2">{selectedStudent?.gender || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">Parent/Guardian</Typography>
                      <Typography variant="body2">{selectedStudent?.parent_name || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">Parent Phone</Typography>
                      <Typography variant="body2">{selectedStudent?.parent_phone || 'N/A'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">Class</Typography>
                      <Typography variant="body2">{selectedStudent?.class_name || 'Unassigned'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Chip 
                        label={selectedStudent?.status || 'Active'} 
                        size="small" 
                        color={getStatusColor(selectedStudent?.status || '') as any} 
                      />
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Recent Activity
                  </Typography>
                  {studentDetails.grades.length === 0 && studentDetails.attendance.length === 0 ? (
                    <Typography color="text.secondary">No activity recorded yet</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {studentDetails.grades.slice(0, 3).map((grade, i) => (
                        <Card key={i} variant="outlined" sx={{ p: 1 }}>
                          <Typography variant="body2">
                            Grade: <strong>{grade.marks_obtained}/{grade.total_marks}</strong> in {grade.subject}
                          </Typography>
                        </Card>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* Grades Tab */}
              {detailsTab === 1 && (
                <Box>
                  {studentDetails.grades.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      No grades recorded
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Subject</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Percentage</TableCell>
                            <TableCell>Grade</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {studentDetails.grades.map((grade, i) => (
                            <TableRow key={i}>
                              <TableCell>{grade.subject}</TableCell>
                              <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={grade.percentage || 0}
                                    sx={{ width: 60, height: 8, borderRadius: 4 }}
                                  />
                                  {grade.percentage}%
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip label={grade.grade_letter} size="small" color="primary" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* Attendance Tab */}
              {detailsTab === 2 && (
                <Box>
                  {studentDetails.attendance.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      No attendance records
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {studentDetails.attendance.slice(0, 10).map((att, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                {new Date(att.attendance_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={att.status}
                                  size="small"
                                  color={att.status === 'Present' ? 'success' : att.status === 'Late' ? 'warning' : 'error'}
                                />
                              </TableCell>
                              <TableCell>{att.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* Test Results Tab */}
              {detailsTab === 3 && (
                <Box>
                  {studentDetails.testResults.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      No test results
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Test</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {studentDetails.testResults.map((result, i) => (
                            <TableRow key={i}>
                              <TableCell>{result.test_name}</TableCell>
                              <TableCell>
                                {result.score !== null ? `${result.score}/${result.total_marks}` : '-'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={result.status}
                                  size="small"
                                  color={result.status === 'graded' ? 'success' : 'warning'}
                                />
                              </TableCell>
                              <TableCell>
                                {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString() : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => navigate(`/student/${selectedStudent?.student_id}`)}
          >
            View Full Profile
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherStudentsTab;
