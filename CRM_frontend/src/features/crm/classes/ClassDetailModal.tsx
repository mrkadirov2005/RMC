import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  Stack,
  Button,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  useTheme,
  TextField,
  MenuItem,
  Chip,
} from '@mui/material';
import { Close as CloseIcon, Check as CheckIcon } from '@mui/icons-material';
import { studentAPI, attendanceAPI, gradeAPI } from '../../../shared/api/api';
import { showToast } from '../../../utils/toast';
import { fetchSubjects } from '../../../utils/dropdownOptions';
import ClassCalendar from './ClassCalendar';

interface Class {
  class_id?: number;
  id?: number;
  center_id: number;
  class_name: string;
  class_code: string;
  level: number;
  section: string;
  capacity: number;
  teacher_id?: number;
  room_number: string;
  payment_amount: number;
  payment_frequency: string;
  schedule?: string; // JSON string: { days: ['Monday', 'Wednesday', 'Friday'], time: '10:00' }
}

interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  class_id: number;
}

interface Attendance {
  attendance_id?: number;
  id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

interface ClassDetailModalProps {
  open: boolean;
  classData: Class | null;
  onClose: () => void;
}

const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ open, classData, onClose }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);

  // Bulk Grading State
  const [gradeMarks, setGradeMarks] = useState<Map<number, number | string>>(new Map());
  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeTotalMarks, setGradeTotalMarks] = useState(100);
  const [gradeAcademicYear, setGradeAcademicYear] = useState(new Date().getFullYear());
  const [gradeTerm, setGradeTerm] = useState('First');
  const [submittingGrades, setSubmittingGrades] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<{ id: number; label: string; value: any }[]>([]);

  useEffect(() => {
    if (open && classData) {
      loadStudents();
      loadTodayAttendance();
      loadSubjects();
    }
  }, [open, classData]);

  const loadSubjects = async () => {
    try {
      const subjects = await fetchSubjects();
      setSubjectOptions(subjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getAll();
      const allStudents = response.data || response;
      const classStudents = Array.isArray(allStudents)
        ? allStudents.filter(
            (student: Student) =>
              (student.class_id === classData?.class_id || student.class_id === classData?.id)
          )
        : [];
      setStudents(classStudents);
      
      // Initialize all students in attendance map (default to false/Absent)
      setAttendance((prevMap) => {
        const newMap = new Map(prevMap);
        classStudents.forEach((student: Student) => {
          if (!newMap.has(student.student_id || student.id || 0)) {
            newMap.set(student.student_id || student.id || 0, false);
          }
        });
        return newMap;
      });
    } catch (error) {
      console.error('Error loading students:', error);
      showToast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      if (!classData?.class_id && !classData?.id) return;
      const response = await attendanceAPI.getByClass(classData?.class_id || classData?.id || 0);
      const allAttendance = response.data || response;
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = Array.isArray(allAttendance)
        ? allAttendance.filter((record: Attendance) => record.attendance_date.split('T')[0] === today)
        : [];
      setTodayAttendance(todayRecords);
      
      // Initialize attendance map
      const newMap = new Map<number, boolean>();
      todayRecords.forEach((record: Attendance) => {
        newMap.set(record.student_id, record.status === 'Present');
      });
      setAttendance(newMap);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const handleAttendanceToggle = (studentId: number, status: boolean) => {
    const newMap = new Map(attendance);
    newMap.set(studentId, status);
    setAttendance(newMap);
  };

  const handleMarkAttendance = async () => {
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const classId = classData?.class_id || classData?.id;

      // Fetch fresh attendance data to avoid race conditions
      const response = await attendanceAPI.getByClass(classId || 0);
      const allAttendance = response.data || response;
      const currentTodayRecords = Array.isArray(allAttendance)
        ? allAttendance.filter((record: Attendance) => record.attendance_date.split('T')[0] === today)
        : [];

      // Create/update attendance for each student
      for (const [studentId, isPresent] of attendance) {
        const existingRecord = currentTodayRecords.find(
          (r: Attendance) => r.student_id === studentId
        );

        const attendanceData = {
          student_id: studentId,
          class_id: classId,
          teacher_id: classData?.teacher_id || 1,
          attendance_date: today,
          status: isPresent ? 'Present' : 'Absent',
          remarks: 'Marked in class detail',
        };

        if (existingRecord) {
          await attendanceAPI.update(existingRecord.attendance_id || existingRecord.id || 0, attendanceData);
        } else {
          await attendanceAPI.create(attendanceData);
        }
      }

      showToast.success('Attendance marked successfully!');
      loadTodayAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      showToast.error('Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeMarksChange = (studentId: number, value: string) => {
    const newMap = new Map(gradeMarks);
    newMap.set(studentId, value === '' ? '' : Number(value));
    setGradeMarks(newMap);
  };

  const getGradeLetter = (marks: number, total: number): string => {
    const percentage = (marks / total) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (letter: string): string => {
    switch (letter) {
      case 'A': return '#4CAF50';
      case 'B': return '#8BC34A';
      case 'C': return '#FFC107';
      case 'D': return '#FF9800';
      case 'F': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const handleSubmitBulkGrades = async () => {
    if (!gradeSubject) {
      showToast.error('Please select a subject');
      return;
    }

    const gradesToSubmit: any[] = [];
    for (const [studentId, marks] of gradeMarks) {
      if (marks === '' || marks === undefined || marks === null) continue;
      const marksNum = Number(marks);
      if (isNaN(marksNum) || marksNum < 0) continue;
      const percentage = (marksNum / gradeTotalMarks) * 100;
      const gradeLetter = getGradeLetter(marksNum, gradeTotalMarks);

      gradesToSubmit.push({
        student_id: studentId,
        teacher_id: classData?.teacher_id || 1,
        subject: gradeSubject,
        class_id: classData?.class_id || classData?.id,
        marks_obtained: marksNum,
        total_marks: gradeTotalMarks,
        percentage,
        grade_letter: gradeLetter,
        academic_year: gradeAcademicYear,
        term: gradeTerm,
      });
    }

    if (gradesToSubmit.length === 0) {
      showToast.error('Please enter marks for at least one student');
      return;
    }

    setSubmittingGrades(true);
    try {
      await gradeAPI.bulkCreate(gradesToSubmit);
      showToast.success(`${gradesToSubmit.length} grades submitted successfully!`);
      // Reset form
      setGradeMarks(new Map());
      setGradeSubject('');
      setGradeTotalMarks(100);
      setGradeTerm('First');
    } catch (error) {
      console.error('Error submitting grades:', error);
      showToast.error('Failed to submit grades');
    } finally {
      setSubmittingGrades(false);
    }
  };

  if (!classData) return null;

  // Parse schedule from section field
  let parsedSchedule = { days: [] as string[], time: '' };
  if (classData.section) {
    try {
      parsedSchedule = JSON.parse(classData.section);
    } catch {
      // If section is not JSON, keep default empty schedule
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {classData.class_name} ({classData.class_code})
        </Typography>
        <Button
          size="small"
          onClick={onClose}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, mt: 2 }}
        >
          <Tab label="Class Info" />
          <Tab label="Students" />
          <Tab label="Attendance" />
          <Tab label="Grades" />
          <Tab label="Calendar" />
        </Tabs>

        {/* Tab 1: Class Info */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Class Code
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.class_code}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Level
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.level}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Section
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.section}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Capacity
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.capacity} students
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Room Number
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.room_number}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Payment Amount
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  ${classData.payment_amount} ({classData.payment_frequency})
                </Typography>
              </Box>
            </Box>

            {/* Schedule Info */}
            <Box
              sx={{
                p: 2,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1,
                mt: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Class Schedule
              </Typography>
              {parsedSchedule.days && parsedSchedule.days.length > 0 ? (
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Days:</strong> {parsedSchedule.days.join(', ')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Time:</strong> {parsedSchedule.time}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No schedule set
                </Typography>
              )}
            </Box>
          </Stack>
        </TabPanel>

        {/* Tab 2: Students */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Alert severity="info">No students enrolled in this class</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Enrollment #</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.student_id || student.id}>
                      <TableCell>{student.enrollment_number}</TableCell>
                      <TableCell>
                        {student.first_name} {student.last_name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Tab 3: Attendance */}
        <TabPanel value={tabValue} index={2}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Alert severity="info">No students to mark attendance</Alert>
          ) : (
            <Stack spacing={2}>
              <Alert severity="info">
                Marking attendance for today ({new Date().toLocaleDateString()})
              </Alert>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Student Name</TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: 'white', fontWeight: 600 }}
                      >
                        Attendance
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => {
                      const studentId = student.student_id || student.id || 0;
                      const isPresent = attendance.get(studentId);
                      return (
                        <TableRow key={studentId}>
                          <TableCell>
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                variant={isPresent === true ? 'contained' : 'outlined'}
                                color="success"
                                onClick={() => handleAttendanceToggle(studentId, true)}
                                startIcon={<CheckIcon />}
                                sx={{ minWidth: 100 }}
                              >
                                Present
                              </Button>
                              <Button
                                size="small"
                                variant={isPresent === false ? 'contained' : 'outlined'}
                                color="error"
                                onClick={() => handleAttendanceToggle(studentId, false)}
                                startIcon={<CloseIcon />}
                                sx={{ minWidth: 100 }}
                              >
                                Absent
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button
                variant="contained"
                onClick={handleMarkAttendance}
                disabled={submitting || students.length === 0}
                sx={{ alignSelf: 'flex-end' }}
              >
                {submitting ? <CircularProgress size={24} /> : 'Mark Attendance'}
              </Button>
            </Stack>
          )}
        </TabPanel>

        {/* Tab 4: Grades */}
        <TabPanel value={tabValue} index={3}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Alert severity="info">No students enrolled in this class to grade</Alert>
          ) : (
            <Stack spacing={3}>
              <Alert severity="info">
                Enter marks for students below, then submit all grades at once.
              </Alert>

              {/* Grade Settings Row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
                <TextField
                  select
                  label="Subject *"
                  value={gradeSubject}
                  onChange={(e) => setGradeSubject(e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="">Select Subject</MenuItem>
                  {subjectOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.label}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Total Marks"
                  type="number"
                  value={gradeTotalMarks}
                  onChange={(e) => setGradeTotalMarks(Number(e.target.value) || 100)}
                  size="small"
                  fullWidth
                  inputProps={{ min: 1 }}
                />
                <TextField
                  label="Academic Year"
                  type="number"
                  value={gradeAcademicYear}
                  onChange={(e) => setGradeAcademicYear(Number(e.target.value))}
                  size="small"
                  fullWidth
                />
                <TextField
                  select
                  label="Term"
                  value={gradeTerm}
                  onChange={(e) => setGradeTerm(e.target.value)}
                  size="small"
                  fullWidth
                >
                  <MenuItem value="First">First</MenuItem>
                  <MenuItem value="Second">Second</MenuItem>
                  <MenuItem value="Third">Third</MenuItem>
                </TextField>
              </Box>

              {/* Students Grading Table */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Student Name</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                        Marks (/{gradeTotalMarks})
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                        Percentage
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                        Grade
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student, index) => {
                      const studentId = student.student_id || student.id || 0;
                      const marks = gradeMarks.get(studentId);
                      const marksNum = marks !== undefined && marks !== '' ? Number(marks) : null;
                      const percentage = marksNum !== null && !isNaN(marksNum) ? (marksNum / gradeTotalMarks) * 100 : null;
                      const gradeLetter = marksNum !== null && !isNaN(marksNum) ? getGradeLetter(marksNum, gradeTotalMarks) : null;

                      return (
                        <TableRow key={studentId} sx={{ '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover } }}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell align="center" sx={{ width: 140 }}>
                            <TextField
                              type="number"
                              size="small"
                              value={marks !== undefined ? marks : ''}
                              onChange={(e) => handleGradeMarksChange(studentId, e.target.value)}
                              inputProps={{ min: 0, max: gradeTotalMarks, step: 0.5 }}
                              sx={{ width: 100 }}
                              placeholder="--"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {percentage !== null ? (
                              <Typography variant="body2" fontWeight={500}>
                                {percentage.toFixed(1)}%
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">--</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {gradeLetter ? (
                              <Chip
                                label={gradeLetter}
                                size="small"
                                sx={{
                                  backgroundColor: getGradeColor(gradeLetter),
                                  color: 'white',
                                  fontWeight: 700,
                                  minWidth: 36,
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">--</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Summary & Submit */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {Array.from(gradeMarks.values()).filter((v) => v !== '' && v !== undefined).length} of {students.length} students graded
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleSubmitBulkGrades}
                  disabled={submittingGrades || students.length === 0}
                  size="large"
                  sx={{ minWidth: 180 }}
                >
                  {submittingGrades ? <CircularProgress size={24} /> : 'Submit All Grades'}
                </Button>
              </Box>
            </Stack>
          )}
        </TabPanel>

        {/* Tab 5: Calendar */}
        <TabPanel value={tabValue} index={4}>
          <ClassCalendar schedule={parsedSchedule} />
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailModal;
