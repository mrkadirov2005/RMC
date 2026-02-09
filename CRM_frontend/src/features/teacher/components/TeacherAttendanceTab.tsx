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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
} from '@mui/material';
import {
  EventNote as AttendanceIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  Schedule as LateIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { classAPI, studentAPI, attendanceAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
  student_count?: number;
}

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
}

interface AttendanceRecord {
  student_id: number;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  notes?: string;
}

interface TeacherAttendanceTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherAttendanceTab = ({ teacherId, onRefresh }: TeacherAttendanceTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Map<number, AttendanceRecord>>(new Map());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);

  useEffect(() => {
    loadClasses();
  }, [teacherId]);

  useEffect(() => {
    if (selectedClass) {
      loadClassStudents();
      loadExistingAttendance();
    }
  }, [selectedClass, attendanceDate]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAll();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassStudents = async () => {
    try {
      setStudentsLoading(true);
      const response = await studentAPI.getAll();
      // Filter by class if the API supports it
      const allStudents = response.data || [];
      const classStudents = selectedClass
        ? allStudents.filter((s: any) => s.class_id === selectedClass)
        : allStudents;
      setStudents(classStudents);
      
      // Initialize attendance records
      const initialAttendance = new Map<number, AttendanceRecord>();
      classStudents.forEach((student: Student) => {
        initialAttendance.set(student.student_id, {
          student_id: student.student_id,
          status: 'Present',
        });
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      if (!selectedClass) return;
      const response = await attendanceAPI.getByClass(selectedClass);
      const existing = (response.data || []).filter(
        (a: any) => a.attendance_date?.split('T')[0] === attendanceDate
      );
      setExistingAttendance(existing);

      // Update attendance map with existing records
      const updatedAttendance = new Map(attendance);
      existing.forEach((record: any) => {
        updatedAttendance.set(record.student_id, {
          student_id: record.student_id,
          status: record.status,
          notes: record.notes,
        });
      });
      setAttendance(updatedAttendance);
    } catch (error) {
      console.error('Error loading existing attendance:', error);
    }
  };

  const handleStatusChange = (studentId: number, status: 'Present' | 'Absent' | 'Late' | 'Half Day') => {
    const current = attendance.get(studentId) || { student_id: studentId, status: 'Present' };
    const updated = new Map(attendance);
    updated.set(studentId, { ...current, status });
    setAttendance(updated);
  };

  const handleNotesChange = (studentId: number, notes: string) => {
    const current = attendance.get(studentId) || { student_id: studentId, status: 'Present' };
    const updated = new Map(attendance);
    updated.set(studentId, { ...current, notes });
    setAttendance(updated);
  };

  const markAllPresent = () => {
    const updated = new Map<number, AttendanceRecord>();
    students.forEach((student) => {
      updated.set(student.student_id, {
        student_id: student.student_id,
        status: 'Present',
      });
    });
    setAttendance(updated);
  };

  const markAllAbsent = () => {
    const updated = new Map<number, AttendanceRecord>();
    students.forEach((student) => {
      updated.set(student.student_id, {
        student_id: student.student_id,
        status: 'Absent',
      });
    });
    setAttendance(updated);
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setError(null);

      const records = Array.from(attendance.values()).map((record) => ({
        student_id: record.student_id,
        class_id: selectedClass,
        attendance_date: attendanceDate,
        status: record.status,
        remarks: record.notes,
        teacher_id: teacherId,
      }));

      // Save each record
      for (const record of records) {
        await attendanceAPI.create(record);
      }

      setSuccess(`Attendance saved successfully for ${records.length} students`);
      setShowSaveDialog(false);
      onRefresh?.();
    } catch (err: any) {
      setError('Failed to save attendance. Please try again.');
      console.error('Error saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  const attendanceStats = {
    present: Array.from(attendance.values()).filter((a) => a.status === 'Present').length,
    absent: Array.from(attendance.values()).filter((a) => a.status === 'Absent').length,
    late: Array.from(attendance.values()).filter((a) => a.status === 'Late').length,
    halfDay: Array.from(attendance.values()).filter((a) => a.status === 'Half Day').length,
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Take Attendance
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            type="date"
            label="Date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Class</InputLabel>
            <Select
              value={selectedClass}
              label="Select Class"
              onChange={(e) => setSelectedClass(e.target.value as number)}
            >
              {classes.map((cls) => (
                <MenuItem key={cls.class_id} value={cls.class_id}>
                  {cls.class_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {!selectedClass ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            bgcolor: '#f9f9f9',
            borderRadius: 2,
            border: '2px dashed #e0e0e0',
          }}
        >
          <AttendanceIcon sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Select a class to take attendance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a class from the dropdown above
          </Typography>
        </Box>
      ) : studentsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : students.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No students in this class</Typography>
        </Box>
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ bgcolor: '#43e97b15', textAlign: 'center' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" color="success.main" fontWeight={700}>
                    {attendanceStats.present}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Present
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ bgcolor: '#f5576c15', textAlign: 'center' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" color="error.main" fontWeight={700}>
                    {attendanceStats.absent}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Absent
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ bgcolor: '#ffc10715', textAlign: 'center' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" color="warning.main" fontWeight={700}>
                    {attendanceStats.late}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Late
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Card sx={{ bgcolor: '#4facfe15', textAlign: 'center' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" color="info.main" fontWeight={700}>
                    {attendanceStats.halfDay}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Half Day
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button variant="outlined" color="success" onClick={markAllPresent} startIcon={<PresentIcon />}>
              Mark All Present
            </Button>
            <Button variant="outlined" color="error" onClick={markAllAbsent} startIcon={<AbsentIcon />}>
              Mark All Absent
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowSaveDialog(true)}
              startIcon={<SaveIcon />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Save Attendance
            </Button>
          </Box>

          {existingAttendance.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Attendance already recorded for this date. Saving will update the records.
            </Alert>
          )}

          {/* Attendance Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell width={50}>#</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Enrollment #</TableCell>
                  <TableCell width={300}>Status</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student, index) => {
                  const record = attendance.get(student.student_id);
                  return (
                    <TableRow key={student.student_id} sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: '#667eea', width: 32, height: 32, fontSize: 14 }}>
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {student.first_name} {student.last_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {student.enrollment_number}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <ToggleButtonGroup
                          value={record?.status || 'Present'}
                          exclusive
                          onChange={(_, value) => value && handleStatusChange(student.student_id, value)}
                          size="small"
                        >
                          <ToggleButton value="Present" sx={{ color: 'success.main' }}>
                            <Tooltip title="Present">
                              <PresentIcon fontSize="small" />
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value="Absent" sx={{ color: 'error.main' }}>
                            <Tooltip title="Absent">
                              <AbsentIcon fontSize="small" />
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value="Late" sx={{ color: 'warning.main' }}>
                            <Tooltip title="Late">
                              <LateIcon fontSize="small" />
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value="Half Day" sx={{ color: 'info.main' }}>
                            <Tooltip title="Half Day">
                              <Box component="span">HD</Box>
                            </Tooltip>
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Add notes..."
                          value={record?.notes || ''}
                          onChange={(e) => handleNotesChange(student.student_id, e.target.value)}
                          sx={{ width: 200 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>Save Attendance</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            You are about to save attendance for <strong>{students.length}</strong> students on{' '}
            <strong>{new Date(attendanceDate).toLocaleDateString()}</strong>.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              icon={<PresentIcon />}
              label={`${attendanceStats.present} Present`}
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<AbsentIcon />}
              label={`${attendanceStats.absent} Absent`}
              color="error"
              variant="outlined"
            />
            <Chip
              icon={<LateIcon />}
              label={`${attendanceStats.late} Late`}
              color="warning"
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSaveAttendance}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherAttendanceTab;
