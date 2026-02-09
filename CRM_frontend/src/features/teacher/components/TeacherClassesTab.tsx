import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Class as ClassIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { classAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
  description?: string;
  teacher_id?: number;
  status: string;
  student_count?: number;
  schedule?: string;
}

interface TeacherClassesTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherClassesTab = ({ teacherId, onRefresh: _onRefresh }: TeacherClassesTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, [teacherId]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAll();
      // Filter classes by teacher if needed
      const allClasses = response.data || [];
      setClasses(allClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'completed':
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

  if (classes.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          bgcolor: '#f9f9f9',
          borderRadius: 2,
          border: '2px dashed #e0e0e0',
        }}
      >
        <ClassIcon sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No classes assigned yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Classes will appear here once they are assigned to you
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {classes.map((classItem) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={classItem.class_id}>
          <Card
            sx={{
              height: '100%',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#667eea15',
                    color: '#667eea',
                  }}
                >
                  <ClassIcon />
                </Box>
                <Chip
                  label={classItem.status || 'Active'}
                  size="small"
                  color={getStatusColor(classItem.status) as any}
                />
              </Box>

              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                {classItem.class_name}
              </Typography>

              {classItem.description && (
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
                  {classItem.description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <PeopleIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {classItem.student_count || 0} Students
                </Typography>
              </Box>

              {classItem.schedule && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <TimeIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {classItem.schedule}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default TeacherClassesTab;
