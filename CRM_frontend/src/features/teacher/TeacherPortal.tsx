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
  IconButton,
  Tooltip,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  People as StudentsIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Class as ClassIcon,
  EventNote as AttendanceIcon,
  Grade as GradeIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../crm/hooks';
import { useNavigate } from 'react-router-dom';
import TeacherStudentsTab from './components/TeacherStudentsTab';
import TeacherTestsTab from './components/TeacherTestsTab';
import TeacherClassesTab from './components/TeacherClassesTab';
import TeacherAttendanceTab from './components/TeacherAttendanceTab';
import TeacherGradesTab from './components/TeacherGradesTab';
import TeacherAssignmentsTab from './components/TeacherAssignmentsTab';
import type { RootState } from '../../store';
import { testAPI, studentAPI, classAPI, attendanceAPI, assignmentAPI } from '../../shared/api/api';

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
      id={`teacher-tabpanel-${index}`}
      aria-labelledby={`teacher-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface TeacherStats {
  totalStudents: number;
  totalClasses: number;
  pendingTests: number;
  completedTests: number;
  pendingGrading: number;
  todayAttendance: number;
  pendingAssignments: number;
  upcomingClasses: number;
}

const TeacherPortal = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    totalClasses: 0,
    pendingTests: 0,
    completedTests: 0,
    pendingGrading: 0,
    todayAttendance: 0,
    pendingAssignments: 0,
    upcomingClasses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [quickAddAnchor, setQuickAddAnchor] = useState<null | HTMLElement>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [testsRes, studentsRes, classesRes, attendanceRes, assignmentsRes] = await Promise.all([
        testAPI.getAll().catch(() => ({ data: [] })),
        studentAPI.getAll().catch(() => ({ data: [] })),
        classAPI.getAll().catch(() => ({ data: [] })),
        attendanceAPI.getAll().catch(() => ({ data: [] })),
        assignmentAPI.getAll().catch(() => ({ data: [] })),
      ]);

      const tests = testsRes.data || [];
      const students = studentsRes.data || [];
      const classes = classesRes.data || [];
      const attendance = attendanceRes.data || [];
      const assignments = assignmentsRes.data || [];

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance.filter(
        (a: any) => a.attendance_date?.split('T')[0] === today
      ).length;

      const pendingTests = tests.filter((t: any) => t.is_active).length;
      const completedTests = tests.length - pendingTests;
      const pendingGrading = tests.filter((t: any) => (t.submission_count || 0) > 0).length;
      const pendingAssignments = assignments.filter((a: any) => a.status === 'Pending').length;

      setStats({
        totalStudents: students.length,
        totalClasses: classes.length,
        pendingTests,
        completedTests,
        pendingGrading,
        todayAttendance,
        pendingAssignments,
        upcomingClasses: classes.filter((c: any) => c.status === 'Active').length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleQuickAdd = (event: React.MouseEvent<HTMLElement>) => {
    setQuickAddAnchor(event.currentTarget);
  };

  const handleQuickAddClose = () => {
    setQuickAddAnchor(null);
  };

  const handleQuickAction = (action: string) => {
    handleQuickAddClose();
    switch (action) {
      case 'test':
        navigate('/tests/create');
        break;
      case 'attendance':
        setTabValue(3);
        break;
      case 'assignment':
        navigate('/assignments');
        break;
      case 'grade':
        setTabValue(4);
        break;
      default:
        break;
    }
  };

  const statsCards = [
    {
      title: 'My Students',
      value: stats.totalStudents,
      icon: <StudentsIcon sx={{ fontSize: 40 }} />,
      color: '#667eea',
      trend: '+5%',
    },
    {
      title: 'My Classes',
      value: stats.totalClasses,
      icon: <ClassIcon sx={{ fontSize: 40 }} />,
      color: '#764ba2',
      trend: null,
    },
    {
      title: 'Active Tests',
      value: stats.pendingTests,
      icon: <QuizIcon sx={{ fontSize: 40 }} />,
      color: '#f5576c',
      trend: null,
    },
    {
      title: 'Pending Grading',
      value: stats.pendingGrading,
      icon: <GradeIcon sx={{ fontSize: 40 }} />,
      color: '#4facfe',
      trend: stats.pendingGrading > 0 ? 'Needs attention' : null,
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      icon: <AttendanceIcon sx={{ fontSize: 40 }} />,
      color: '#43e97b',
      trend: null,
    },
    {
      title: 'Pending Assignments',
      value: stats.pendingAssignments,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#fa709a',
      trend: stats.pendingAssignments > 0 ? `${stats.pendingAssignments} to review` : null,
    },
  ];

  const tabs = [
    { label: 'My Students', icon: <StudentsIcon /> },
    { label: 'My Tests', icon: <QuizIcon /> },
    { label: 'My Classes', icon: <ClassIcon /> },
    { label: 'Attendance', icon: <AttendanceIcon /> },
    { label: 'Grades', icon: <GradeIcon /> },
    { label: 'Assignments', icon: <AssignmentIcon /> },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, position: 'relative' }}>
      {/* Header with teacher info */}
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
        <Box
          sx={{
            position: 'absolute',
            right: 100,
            bottom: -80,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
          }}
        />
        <CardContent sx={{ py: 3, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  fontSize: 32,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  border: '3px solid rgba(255,255,255,0.3)',
                }}
              >
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  Welcome back, {user?.first_name}!
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Teacher Portal - Manage your classes, students, and tests
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip
                    label="Teacher"
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  {user?.roles && user.roles.length > 0 && user.roles.map((role: string) => (
                    <Chip
                      key={role}
                      label={role}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Notifications">
                <IconButton sx={{ color: 'white' }}>
                  <NotificationsIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Schedule">
                <IconButton sx={{ color: 'white' }}>
                  <ScheduleIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => {
                const tabMapping: { [key: string]: number } = {
                  'My Students': 0,
                  'My Classes': 2,
                  'Active Tests': 1,
                  'Pending Grading': 4,
                  "Today's Attendance": 3,
                  'Pending Assignments': 5,
                };
                const tabIndex = tabMapping[stat.title];
                if (tabIndex !== undefined) {
                  setTabValue(tabIndex);
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {stat.value}
                    </Typography>
                    {stat.trend && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main', mr: 0.5 }} />
                        <Typography variant="caption" color="success.main">
                          {stat.trend}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: `${stat.color}15`,
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
          <TabPanel value={tabValue} index={0}>
            <TeacherStudentsTab teacherId={user?.id} onRefresh={loadStats} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <TeacherTestsTab teacherId={user?.id} onRefresh={loadStats} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <TeacherClassesTab teacherId={user?.id} onRefresh={loadStats} />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <TeacherAttendanceTab teacherId={user?.id} onRefresh={loadStats} />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <TeacherGradesTab teacherId={user?.id} onRefresh={loadStats} />
          </TabPanel>
          <TabPanel value={tabValue} index={5}>
            <TeacherAssignmentsTab teacherId={user?.id} onRefresh={loadStats} />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Quick Add FAB */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
        onClick={handleQuickAdd}
      >
        <AddIcon />
      </Fab>

      <Menu
        anchorEl={quickAddAnchor}
        open={Boolean(quickAddAnchor)}
        onClose={handleQuickAddClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleQuickAction('test')}>
          <ListItemIcon>
            <QuizIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create Test</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleQuickAction('attendance')}>
          <ListItemIcon>
            <AttendanceIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Take Attendance</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleQuickAction('assignment')}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create Assignment</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleQuickAction('grade')}>
          <ListItemIcon>
            <GradeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Enter Grades</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TeacherPortal;
