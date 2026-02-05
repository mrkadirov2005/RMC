import { useState } from 'react';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Analytics as AnalyzeIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { debtAPI } from '../../../shared/api/api';

interface UnpaidMonth {
  year: number;
  month: number;
  label: string;
}

interface AnalysisResult {
  student_id: number;
  student_name: string;
  enrollment_number: string;
  unpaid_months: UnpaidMonth[];
  unpaid_months_count: number;
  total_payments: number;
  total_debt_balance: number;
}

interface AnalysisResponse {
  analysis_period: {
    start: string;
    end: string;
    months_analyzed: number;
  };
  summary: {
    total_students_analyzed: number;
    students_with_unpaid_months: number;
    total_unpaid_instances: number;
  };
  results: AnalysisResult[];
}

const DebtAnalyzer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [monthlyFee, setMonthlyFee] = useState<string>('100');
  const [generating, setGenerating] = useState(false);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await debtAPI.analyzeUnpaidMonths();
      setAnalysis(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze payments');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDebts = async () => {
    if (selectedStudents.length === 0 || !monthlyFee) return;

    try {
      setGenerating(true);
      await debtAPI.generateFromAnalysis({
        student_ids: selectedStudents,
        monthly_fee: parseFloat(monthlyFee),
      });
      setGenerateDialogOpen(false);
      setSelectedStudents([]);
      // Re-analyze to show updated data
      handleAnalyze();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate debts');
    } finally {
      setGenerating(false);
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (analysis) {
      setSelectedStudents(analysis.results.map((r) => r.student_id));
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Payment Analysis</Typography>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AnalyzeIcon />}
            onClick={handleAnalyze}
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze Unpaid Months'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {analysis && (
          <>
            {/* Summary Cards */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {analysis.summary.total_students_analyzed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Students Analyzed
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {analysis.summary.students_with_unpaid_months}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  With Unpaid Months
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {analysis.summary.total_unpaid_instances}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Unpaid Instances
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flex: 1, minWidth: 150, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Analysis Period
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {analysis.analysis_period.months_analyzed} months
                </Typography>
              </Paper>
            </Box>

            {/* Results Table */}
            {analysis.results.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Students with Payment Issues ({analysis.results.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={selectAllStudents}>
                      Select All
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setGenerateDialogOpen(true)}
                      disabled={selectedStudents.length === 0}
                    >
                      Generate Debts ({selectedStudents.length})
                    </Button>
                  </Box>
                </Box>

                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedStudents.length === analysis.results.length}
                            onChange={(e) =>
                              e.target.checked ? selectAllStudents() : setSelectedStudents([])
                            }
                          />
                        </TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell align="center">Unpaid Months</TableCell>
                        <TableCell align="center">Total Payments</TableCell>
                        <TableCell align="right">Current Debt</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysis.results.map((result) => (
                        <>
                          <TableRow
                            key={result.student_id}
                            sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                          >
                            <TableCell padding="checkbox">
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(result.student_id)}
                                onChange={() => toggleStudentSelection(result.student_id)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight={600}>{result.student_name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {result.enrollment_number}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={result.unpaid_months_count}
                                color={result.unpaid_months_count > 3 ? 'error' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">{result.total_payments}</TableCell>
                            <TableCell align="right">
                              ${result.total_debt_balance.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setExpandedStudent(
                                    expandedStudent === result.student_id ? null : result.student_id
                                  )
                                }
                              >
                                {expandedStudent === result.student_id ? (
                                  <CollapseIcon />
                                ) : (
                                  <ExpandIcon />
                                )}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={6} sx={{ py: 0 }}>
                              <Collapse in={expandedStudent === result.student_id}>
                                <Box sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Unpaid Months:
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {result.unpaid_months.map((month, i) => (
                                      <Chip
                                        key={i}
                                        label={month.label}
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Alert severity="success">
                All students have made payments for the analyzed period!
              </Alert>
            )}
          </>
        )}

        {/* Generate Debts Dialog */}
        <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)}>
          <DialogTitle>Generate Debt Records</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              This will create debt records for {selectedStudents.length} selected student(s).
            </Typography>
            <TextField
              label="Monthly Fee Amount"
              type="number"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
              InputProps={{ startAdornment: '$' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGenerateDebts}
              disabled={generating || !monthlyFee}
            >
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DebtAnalyzer;
