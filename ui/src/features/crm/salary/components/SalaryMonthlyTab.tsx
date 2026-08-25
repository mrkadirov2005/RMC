// "Monthly" tab: total salary paid per month as a bar chart, with a teacher list
// on the right that drills into a per-teacher paid/unpaid pie chart.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart } from '@/shared/components/BarChart';
import { PieChart } from '@/shared/components/PieChart';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchTeachers } from '@/slices/teachersSlice';
import {
  fetchSalaryMonthlySummary,
  selectSalaryMonthlySummary,
  selectSalaryMonthlySummaryLoading,
} from '@/slices/salariesSlice';
import { useSalaryTeacherDetail } from '../hooks/useSalaryTeacherDetail';
import { formatSalaryPeriod, teacherFullName } from '../model/salaryModel';
import { formatMoney } from '@/utils/helpers';

const BAR_GRADIENTS = [
  'linear-gradient(180deg, #34d399, #0d9488)',
  'linear-gradient(180deg, #38bdf8, #4f46e5)',
  'linear-gradient(180deg, #fbbf24, #ea580c)',
  'linear-gradient(180deg, #f472b6, #db2777)',
  'linear-gradient(180deg, #a78bfa, #7c3aed)',
  'linear-gradient(180deg, #22d3ee, #0891b2)',
];

const PAID_COLOR = '#10b981';
const UNPAID_COLOR = '#f43f5e';

export const SalaryMonthlyTab = () => {
  const dispatch = useAppDispatch();
  const monthlySummary = useAppSelector(selectSalaryMonthlySummary);
  const monthlySummaryLoading = useAppSelector(selectSalaryMonthlySummaryLoading);
  const teachers = useAppSelector((state: any) => state.teachers.items);

  const [search, setSearch] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchSalaryMonthlySummary({ months: 6 }));
    dispatch(fetchTeachers());
  }, [dispatch]);

  const barData = useMemo(
    () =>
      monthlySummary.map((entry, index) => ({
        label: formatSalaryPeriod(entry.year, entry.month),
        value: Number(entry.total_amount) || 0,
        color: BAR_GRADIENTS[index % BAR_GRADIENTS.length],
      })),
    [monthlySummary]
  );

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (teachers as any[]).filter((teacher) => {
      if (!query) return true;
      const name = `${teacher.first_name || ''} ${teacher.last_name || ''}`.toLowerCase();
      return name.includes(query);
    });
  }, [teachers, search]);

  const selectedTeacher = (teachers as any[]).find(
    (teacher) => Number(teacher.teacher_id || teacher.id) === selectedTeacherId
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold">Total salary paid per month</h3>
        {monthlySummaryLoading ? (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <BarChart data={barData} height={200} barSize={40} showEmptyState={false} />
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        {selectedTeacherId ? (
          <TeacherSalaryPieView
            teacherId={selectedTeacherId}
            teacherName={selectedTeacher ? teacherFullName(selectedTeacher) : `Teacher #${selectedTeacherId}`}
            onBack={() => setSelectedTeacherId(null)}
          />
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teachers..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="max-h-[320px] space-y-1 overflow-y-auto">
              {filteredTeachers.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">No teachers found</p>
              ) : (
                filteredTeachers.map((teacher) => {
                  const id = Number(teacher.teacher_id || teacher.id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedTeacherId(id)}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-semibold hover:bg-muted/60"
                    >
                      <span className="truncate">{teacherFullName(teacher)}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TeacherSalaryPieView = ({
  teacherId,
  teacherName,
  onBack,
}: {
  teacherId: number;
  teacherName: string;
  onBack: () => void;
}) => {
  const navigate = useNavigate();
  const { detail, loading } = useSalaryTeacherDetail(teacherId, 12);

  const { paid, unpaid } = useMemo(() => {
    const history = detail?.history || [];
    const paidCount = history.filter((entry) => entry.salary?.is_paid).length;
    return { paid: paidCount, unpaid: history.length - paidCount };
  }, [detail]);

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" className="gap-1.5 px-1.5" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to teachers
      </Button>
      <p className="truncate text-sm font-bold">{teacherName}</p>

      {loading ? (
        <div className="flex h-52 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : paid + unpaid === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No salary history yet.</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <PieChart
              size={170}
              strokeWidth={24}
              data={[
                { label: 'Paid', value: paid, color: PAID_COLOR },
                { label: 'Unpaid', value: unpaid, color: UNPAID_COLOR },
              ]}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black">{paid + unpaid}</span>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">Months</span>
            </div>
          </div>
          <div className="flex w-full justify-around text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Paid: {paid}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Unpaid: {unpaid}
            </span>
          </div>
          {detail?.history?.[0]?.salary && (
            <p className="text-[11px] text-muted-foreground">
              Last recorded: {formatMoney(detail.history[0].salary.amount)}
            </p>
          )}
        </div>
      )}

      <Button
        className="w-full gap-2 border-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700"
        onClick={() => navigate(`/salary/${teacherId}`)}
      >
        View full history
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
