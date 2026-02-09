import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Tab,
  Tabs,
  CircularProgress,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Quiz as QuizIcon,
  EventNote as AttendanceIcon,
  Grade as GradeIcon,
  Dashboard as DashboardIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../crm/hooks';
import type { RootState } from '../../store';
import { testAPI, gradeAPI, attendanceAPI } from '../../shared/api/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-tabpanel-${index}`}
      aria-labelledby={`student-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface StudentStats {
  totalTests: number;
  completedTests: number;
  averageGrade: number;
  attendanceRate: number;
  pendingTests: number;
}

const StudentPortal = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<StudentStats>({
    totalTests: 0,
    completedTests: 0,
    averageGrade: 0,
    attendanceRate: 0,
    pendingTests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch tests assigned to student's class (now includes submission_status), grades, and attendance
      const [assignedTestsRes, gradesRes, attendanceRes] = await Promise.all([
        user.class_id ? testAPI.getAssignedTests('class', user.class_id).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        gradeAPI.getByStudent(user.id).catch(() => ({ data: [] })),
        attendanceAPI.getByStudent(user.id).catch(() => ({ data: [] })),
      ]);

      const assignedTests = assignedTestsRes.data || [];
      const gradesData = gradesRes.data || [];
      const attendanceData = attendanceRes.data || [];

      // The backend now returns submission_status directly, normalize null to 'not_started'
      const testsWithStatus = assignedTests.map((test: any) => ({
        ...test,
        submission_status: test.submission_status || 'not_started',
      }));

      setTests(testsWithStatus);
      setGrades(gradesData);
      setAttendance(attendanceData);

      // Calculate stats
      const completedTests = testsWithStatus.filter((t: any) => t.submission_status === 'graded' || t.submission_status === 'submitted').length;
      const presentDays = attendanceData.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
      const attendanceRate = attendanceData.length > 0 ? Math.round((presentDays / attendanceData.length) * 100) : 100;
      const avgGrade = gradesData.length > 0 
        ? Math.round(gradesData.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0) / gradesData.length)
        : 0;
      const pendingTests = testsWithStatus.filter((t: any) => t.submission_status === 'not_started').length;

      setStats({
        totalTests: testsWithStatus.length,
        completedTests,
        averageGrade: avgGrade,
        attendanceRate,
        pendingTests,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const statCards = [
    {
      title: 'Tests Completed',
      value: `${stats.completedTests}/${stats.totalTests}`,
      icon: <QuizIcon />,
      color: '#667eea',
      bgColor: '#667eea15',
    },
    {
      title: 'Average Grade',
      value: `${stats.averageGrade}%`,
      icon: <GradeIcon />,
      color: '#43e97b',
      bgColor: '#43e97b15',
    },
    {
      title: 'Attendance',
      value: `${stats.attendanceRate}%`,
      icon: <AttendanceIcon />,
      color: '#4facfe',
      bgColor: '#4facfe15',
    },
    {
      title: 'Pending Tests',
      value: `${stats.pendingTests}`,
      icon: <ScheduleIcon />,
      color: '#f5576c',
      bgColor: '#f5576c15',
    },
  ];

  const tabs = [
    { label: 'Overview', icon: <DashboardIcon /> },
    { label: 'My Tests', icon: <QuizIcon /> },
    { label: 'My Grades', icon: <GradeIcon /> },
    { label: 'Attendance', icon: <AttendanceIcon /> },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Card */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -50,
            top: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
          }}
        />
        <CardContent sx={{ p: 4, position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'rgba(255,255,255,0.2)',
                fontSize: '2rem',
                fontWeight: 700,
              }}
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                Welcome, {user?.first_name}!
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Student Portal
              </Typography>
              <Chip
                label="Student"
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: stat.bgColor,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs Section */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                minHeight: 64,
              },
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
              />
            ))}
          </Tabs>
        </Box>

        <CardContent>
          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Recent Activity
                    </Typography>
                    {tests.length === 0 && grades.length === 0 ? (
                      <Typography color="text.secondary">No recent activity</Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {tests.slice(0, 3).map((test, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <QuizIcon color="primary" />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {test.test_title || test.title || 'Test'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Score: {test.score || 0}/{test.total_marks || 100}
                              </Typography>
                            </Box>
                            <Chip
                              label={test.status || 'Pending'}
                              size="small"
                              color={test.status === 'graded' ? 'success' : 'default'}
                            />
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Pending Tests
                    </Typography>
                    {tests.filter(t => t.submission_status === 'not_started').length === 0 ? (
                      <Alert severity="success" sx={{ borderRadius: 2 }}>
                        All tests completed!
                      </Alert>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {tests.filter(t => t.submission_status === 'not_started').slice(0, 3).map((test, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <QuizIcon color="warning" />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600}>
                                {test.test_title || test.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Total Marks: {test.total_marks || 100}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* My Tests Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>My Tests</Typography>
              <Chip
                label={`${stats.completedTests} of ${stats.totalTests} completed`}
                color="primary"
                variant="outlined"
              />
            </Box>

            {/* Pending Tests Section */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#f5576c' }}>
              <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
              Pending Tests ({tests.filter(t => t.submission_status === 'not_started').length})
            </Typography>
            {tests.filter(t => t.submission_status === 'not_started').length === 0 ? (
              <Alert severity="success" sx={{ mb: 4 }}>All tests completed!</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fff3e0' }}>
                      <TableCell>Test Name</TableCell>
                      <TableCell>Total Marks</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tests.filter(t => t.submission_status === 'not_started').map((test, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{test.test_title || test.title}</Typography>
                        </TableCell>
                        <TableCell>{test.total_marks || 100}</TableCell>
                        <TableCell>
                          <Chip label="Not Started" size="small" color="warning" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label="Take Test" 
                            size="small" 
                            color="primary" 
                            clickable
                            onClick={() => window.location.href = `/tests/${test.test_id}/take`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Completed Tests Section */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#43e97b' }}>
              <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
              Completed Tests ({tests.filter(t => t.submission_status === 'submitted' || t.submission_status === 'graded').length})
            </Typography>
            {tests.filter(t => t.submission_status === 'submitted' || t.submission_status === 'graded').length === 0 ? (
              <Alert severity="info">No completed tests yet.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                      <TableCell>Test Name</TableCell>
                      <TableCell>Score</TableCell>
                      <TableCell>Percentage</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tests.filter(t => t.submission_status === 'submitted' || t.submission_status === 'graded').map((test, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{test.test_title || test.title}</Typography>
                        </TableCell>
                        <TableCell>{test.score || 0}/{test.total_marks || 100}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={test.total_marks ? (test.score / test.total_marks) * 100 : 0}
                              sx={{ width: 60, height: 8, borderRadius: 4 }}
                              color={test.total_marks && (test.score / test.total_marks) * 100 >= 60 ? 'success' : 'warning'}
                            />
                            <Typography variant="body2">
                              {test.total_marks ? Math.round((test.score / test.total_marks) * 100) : 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={test.submission_status === 'graded' ? 'Graded' : 'Submitted'}
                            size="small"
                            color={test.submission_status === 'graded' ? 'success' : 'info'}
                          />
                        </TableCell>
                        <TableCell>
                          {test.submitted_at ? new Date(test.submitted_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* My Grades Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>My Grades</Typography>
              <Chip
                label={`Average: ${stats.averageGrade}%`}
                color="success"
                variant="outlined"
              />
            </Box>
            {grades.length === 0 ? (
              <Alert severity="info">No grades recorded yet.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>Subject</TableCell>
                      <TableCell>Marks</TableCell>
                      <TableCell>Percentage</TableCell>
                      <TableCell>Grade</TableCell>
                      <TableCell>Term</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grades.map((grade, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{grade.subject_name || grade.subject}</Typography>
                        </TableCell>
                        <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={grade.percentage || 0}
                              sx={{ width: 60, height: 8, borderRadius: 4 }}
                              color={grade.percentage >= 80 ? 'success' : grade.percentage >= 60 ? 'primary' : 'warning'}
                            />
                            <Typography variant="body2">{grade.percentage || 0}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={grade.grade_letter || 'N/A'}
                            size="small"
                            color={
                              grade.grade_letter === 'A' ? 'success' :
                              grade.grade_letter === 'B' ? 'primary' :
                              grade.grade_letter === 'C' ? 'info' :
                              grade.grade_letter === 'D' ? 'warning' : 'error'
                            }
                          />
                        </TableCell>
                        <TableCell>{grade.term || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Attendance Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Attendance Record</Typography>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${stats.attendanceRate}% Attendance`}
                color={stats.attendanceRate >= 80 ? 'success' : stats.attendanceRate >= 60 ? 'warning' : 'error'}
                variant="outlined"
              />
            </Box>
            {attendance.length === 0 ? (
              <Alert severity="info">No attendance records yet.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell>Date</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendance.map((record, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          {record.attendance_date ? new Date(record.attendance_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>{record.class_name || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={record.status}
                            size="small"
                            color={
                              record.status === 'Present' ? 'success' :
                              record.status === 'Late' ? 'warning' :
                              record.status === 'Absent' ? 'error' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{record.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StudentPortal;
