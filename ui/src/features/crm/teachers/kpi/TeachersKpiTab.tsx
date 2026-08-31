import { Loader2, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTeacherKpiOverview } from './hooks/useTeacherKpiOverview';
import { formatKpiPeriod, formatScore, monthInputValue, parseMonthInputValue, teacherFullName } from './model/kpiModel';

export const TeachersKpiTab = () => {
  const navigate = useNavigate();
  const { year, month, setPeriod, search, setSearch, loading, rows } = useTeacherKpiOverview();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {search && (
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Input
          type="month"
          value={monthInputValue(year, month)}
          onChange={(e) => {
            const parsed = parseMonthInputValue(e.target.value);
            if (parsed) setPeriod(parsed.year, parsed.month);
          }}
          className="h-8 w-auto text-xs"
        />
        <span className="text-xs font-semibold text-muted-foreground">{formatKpiPeriod(year, month)}</span>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No teachers found</div>
        ) : (
          <Table className="text-xs">
            <TableHeader className="bg-slate-50/90 dark:bg-transparent">
              <TableRow>
                <TableHead className="h-8 px-2">Teacher</TableHead>
                <TableHead className="h-8 px-2 text-right">Student Scores</TableHead>
                <TableHead className="h-8 px-2 text-right">Retention</TableHead>
                <TableHead className="h-8 px-2 text-right">Contribution</TableHead>
                <TableHead className="h-8 px-2 text-right">Teaching Quality</TableHead>
                <TableHead className="h-8 px-2 text-right">Final KPI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.teacher_id}
                  className="cursor-pointer hover:bg-sky-50/60 dark:hover:bg-muted/50"
                  onClick={() => navigate(`/teachers/${row.teacher_id}/kpi`)}
                >
                  <TableCell className="px-2 py-2 font-semibold">{teacherFullName(row)}</TableCell>
                  <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.student_score ?? row.preview.student_score)}</TableCell>
                  <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.retention_score ?? row.preview.retention_score)}</TableCell>
                  <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.contribution_score)}</TableCell>
                  <TableCell className="px-2 py-2 text-right">{formatScore(row.kpi?.teaching_quality_score)}</TableCell>
                  <TableCell className="px-2 py-2 text-right font-bold text-primary">{formatScore(row.kpi?.final_score)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default TeachersKpiTab;
