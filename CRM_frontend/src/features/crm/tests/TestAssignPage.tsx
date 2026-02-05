import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Chip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  People as PeopleIcon,
  Class as ClassIcon,
} from '@mui/icons-material';
import { testAPI, studentAPI, classAPI } from '../../../shared/api/api';
import { toast } from 'react-toastify';

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  phone_number?: string;
  class_name?: string;
}

interface ClassType {
  class_id: number;
  class_name: string;
  students_count?: number;
}

const TestAssignPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [assignmentType, setAssignmentType] = useState<'all' | 'class' | 'individual'>('all');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);

  useEffect(() => {
    loadData();
  }, [testId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [testRes, studentsRes, classesRes] = await Promise.all([
        testAPI.getById(Number(testId)),
        studentAPI.getAll(),
        classAPI.getAll(),
      ]);
      
      setTest(testRes.data);
      setStudents(studentsRes.data || []);
      setClasses(classesRes.data || []);
      
      // Pre-fill from test data
      if (testRes.data.assignment_type) {
        setAssignmentType(testRes.data.assignment_type);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (studentId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleClassToggle = (classId: number) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.student_id));
    }
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(classes.map((c) => c.class_id));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Build assignments array based on type
      // Backend expects: { assigned_to_type, assigned_to_id, due_date, is_mandatory, notes }
      let assignments: any[] = [];
      
      if (assignmentType === 'all') {
        // Assign to all students individually
        assignments = students.map((s) => ({
          assigned_to_type: 'student',
          assigned_to_id: s.student_id,
          due_date: dueDate || null,
          is_mandatory: isMandatory,
        }));
      } else if (assignmentType === 'class') {
        // Assign by class - each selected class gets an assignment entry
        assignments = selectedClasses.map((classId) => ({
          assigned_to_type: 'class',
          assigned_to_id: classId,
          due_date: dueDate || null,
          is_mandatory: isMandatory,
        }));
      } else {
        // Individual students
        assignments = selectedStudents.map((studentId) => ({
          assigned_to_type: 'student',
          assigned_to_id: studentId,
          due_date: dueDate || null,
          is_mandatory: isMandatory,
        }));
      }

      // Get current user ID from localStorage
      const authData = localStorage.getItem('crm_auth');
      const userId = authData ? JSON.parse(authData).user?.id : 0;

      await testAPI.assignTest(Number(testId), assignments, userId);
      
      toast.success('Test assigned successfully!');
      navigate(`/tests/${testId}`);
    } catch (err: any) {
      console.error('Error assigning test:', err);
      setError(err.response?.data?.error || 'Failed to assign test');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate(`/tests/${testId}`)}>
          Back
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Assign Test
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {test?.test_name}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Assignment Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Assignment Settings
          </Typography>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Assignment Type</InputLabel>
                <Select
                  value={assignmentType}
                  label="Assignment Type"
                  onChange={(e) => setAssignmentType(e.target.value as any)}
                >
                  <MenuItem value="all">All Students</MenuItem>
                  <MenuItem value="class">By Class</MenuItem>
                  <MenuItem value="individual">Individual Students</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Mandatory</InputLabel>
                <Select
                  value={isMandatory ? 'yes' : 'no'}
                  label="Mandatory"
                  onChange={(e) => setIsMandatory(e.target.value === 'yes')}
                >
                  <MenuItem value="yes">Yes - Required</MenuItem>
                  <MenuItem value="no">No - Optional</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Selection Based on Type */}
      {assignmentType === 'all' && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <PeopleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6">
              This test will be assigned to all students
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total: {students.length} students
            </Typography>
          </CardContent>
        </Card>
      )}

      {assignmentType === 'class' && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Select Classes
              </Typography>
              <Button size="small" onClick={handleSelectAllClasses}>
                {selectedClasses.length === classes.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>
            
            {classes.length === 0 ? (
              <Typography color="text.secondary">No classes available</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {classes.map((cls) => (
                  <Chip
                    key={cls.class_id}
                    icon={<ClassIcon />}
                    label={cls.class_name}
                    onClick={() => handleClassToggle(cls.class_id)}
                    color={selectedClasses.includes(cls.class_id) ? 'primary' : 'default'}
                    variant={selectedClasses.includes(cls.class_id) ? 'filled' : 'outlined'}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
            )}
            
            {selectedClasses.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Selected: {selectedClasses.length} class(es)
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {assignmentType === 'individual' && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Select Students
              </Typography>
              <Button size="small" onClick={handleSelectAllStudents}>
                {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>
            
            {students.length === 0 ? (
              <Typography color="text.secondary">No students available</Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedStudents.length === students.length}
                          indeterminate={selectedStudents.length > 0 && selectedStudents.length < students.length}
                          onChange={handleSelectAllStudents}
                        />
                      </TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Class</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow
                        key={student.student_id}
                        hover
                        onClick={() => handleStudentToggle(student.student_id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedStudents.includes(student.student_id)} />
                        </TableCell>
                        <TableCell>
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>{student.phone_number || '-'}</TableCell>
                        <TableCell>{student.class_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {selectedStudents.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Selected: {selectedStudents.length} student(s)
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate(`/tests/${testId}`)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || (assignmentType === 'class' && selectedClasses.length === 0) || (assignmentType === 'individual' && selectedStudents.length === 0)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          {saving ? 'Saving...' : 'Save Assignment'}
        </Button>
      </Box>
    </Box>
  );
};

export default TestAssignPage;
