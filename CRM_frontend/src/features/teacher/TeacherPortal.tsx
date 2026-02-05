import { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  People as StudentsIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Class as ClassIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../crm/hooks';
import TeacherStudentsTab from './components/TeacherStudentsTab.tsx';
import TeacherTestsTab from './components/TeacherTestsTab.tsx';
import TeacherClassesTab from './components/TeacherClassesTab.tsx';
import type { RootState } from '../../store';

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

const TeacherPortal = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [tabValue, setTabValue] = useState(0);
  const [stats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    pendingTests: 0,
    completedTests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load teacher-specific stats
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(false);
    // Stats will be loaded from API in the future
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const statsCards = [
    {
      title: 'My Students',
      value: stats.totalStudents,
      icon: <StudentsIcon sx={{ fontSize: 40 }} />,
      color: '#667eea',
    },
    {
      title: 'My Classes',
      value: stats.totalClasses,
      icon: <ClassIcon sx={{ fontSize: 40 }} />,
      color: '#764ba2',
    },
    {
      title: 'Pending Tests',
      value: stats.pendingTests,
      icon: <QuizIcon sx={{ fontSize: 40 }} />,
      color: '#f5576c',
    },
    {
      title: 'Completed Tests',
      value: stats.completedTests,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#4facfe',
    },
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
      {/* Header with teacher info */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                fontSize: 32,
                bgcolor: 'rgba(255,255,255,0.2)',
              }}
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Welcome back, {user?.first_name}!
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 0.5 }}>
                Teacher Portal
              </Typography>
              <Chip
                label="Teacher"
                size="small"
                sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      {stat.title}
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 1.5,
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
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
              },
            }}
          >
            <Tab icon={<StudentsIcon />} iconPosition="start" label="My Students" />
            <Tab icon={<QuizIcon />} iconPosition="start" label="Tests" />
            <Tab icon={<ClassIcon />} iconPosition="start" label="My Classes" />
          </Tabs>
        </Box>
        
        <CardContent>
          <TabPanel value={tabValue} index={0}>
            <TeacherStudentsTab teacherId={user?.id} />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <TeacherTestsTab teacherId={user?.id} />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <TeacherClassesTab teacherId={user?.id} />
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TeacherPortal;
