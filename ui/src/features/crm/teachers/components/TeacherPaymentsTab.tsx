import { Calendar, BookOpen, User, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TeacherPaymentsTabProps {
  studentClassGroups: Array<{
    classId: number;
    classItem: any;
    students: any[];
    isTeacherOwned: boolean;
  }>;
  directAssignedStudents: any[];
  payments: any[];
  selectedPaymentMonth: string;
  setSelectedPaymentMonth: (value: string) => void;
}

export default function TeacherPaymentsTab({
  studentClassGroups,
  directAssignedStudents,
  payments,
  selectedPaymentMonth,
  setSelectedPaymentMonth,
}: TeacherPaymentsTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Wallet className="h-4 w-4 text-indigo-500" />
          Student Payments
        </h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="payment-month" className="whitespace-nowrap text-xs font-semibold">Select Month:</Label>
          <div className="relative">
            <Input
              id="payment-month"
              type="month"
              value={selectedPaymentMonth}
              onChange={(e) => setSelectedPaymentMonth(e.target.value)}
              className="h-8 w-[160px] pl-8 text-xs"
            />
            <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {studentClassGroups.length === 0 && directAssignedStudents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="h-16 w-16 mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-semibold">No classes or students assigned to this teacher</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {studentClassGroups.map(({ classId, classItem, students: classStudents, isTeacherOwned }) => (
            <PaymentGroup
              key={classId}
              classItem={classItem}
              iconTone="bg-indigo-600"
              title={classItem.class_name}
              subtitle={`(${isTeacherOwned ? 'teacher group' : 'student group'}${classItem.level ? `, level ${classItem.level}` : ''})`}
              students={classStudents}
              payments={payments}
              selectedPaymentMonth={selectedPaymentMonth}
              Icon={BookOpen}
            />
          ))}
          {directAssignedStudents.length > 0 && (
            <PaymentGroup
              classItem={null}
              iconTone="bg-emerald-600"
              title="Directly assigned students"
              students={directAssignedStudents}
              payments={payments}
              selectedPaymentMonth={selectedPaymentMonth}
              Icon={User}
            />
          )}
        </div>
      )}
    </div>
  );
}

const PaymentGroup = ({
  Icon,
  iconTone,
  title,
  subtitle,
  students,
  payments,
  selectedPaymentMonth,
}: {
  Icon: any;
  iconTone: string;
  title: string;
  subtitle?: string;
  classItem: any;
  students: any[];
  payments: any[];
  selectedPaymentMonth: string;
}) => (
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-card text-card-foreground shadow-sm">
    <div className="relative border-b bg-white p-3 dark:bg-card">
      <h4 className="relative z-10 flex items-center justify-between text-sm font-bold text-foreground">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 text-white shadow-sm ${iconTone}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span>
            {title}
            {subtitle && <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">{subtitle}</span>}
          </span>
        </div>
        <Badge className="border-0 bg-emerald-600 text-xs text-white hover:bg-emerald-600">{students.length} Students</Badge>
      </h4>
    </div>
    <div className="p-0">
      <Table className="text-xs">
        <TableHeader className="bg-muted/30">
          <TableRow className="border-b-border">
            <TableHead className="h-8 pl-3 font-semibold text-foreground">Student</TableHead>
            <TableHead className="hidden h-8 font-semibold text-foreground sm:table-cell">Enrollment #</TableHead>
            <TableHead className="h-8 pr-3 text-right font-semibold text-foreground">Payment Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No students</TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <PaymentStudentRow key={student.student_id || student.id} student={student} payments={payments} selectedPaymentMonth={selectedPaymentMonth} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

const PaymentStudentRow = ({
  student,
  payments,
  selectedPaymentMonth,
}: {
  student: any;
  payments: any[];
  selectedPaymentMonth: string;
}) => {
  const studentId = student.student_id || student.id;
  const [year, month] = selectedPaymentMonth.split('-');
  const hasPaid = payments.some((payment) => {
    if (payment.student_id !== studentId) return false;
    if (payment.payment_status?.toLowerCase() !== 'completed') return false;
    const paymentDate = new Date(payment.payment_date);
    return paymentDate.getFullYear() === parseInt(year) && paymentDate.getMonth() + 1 === parseInt(month);
  });

  return (
    <TableRow className="hover:bg-muted/50 transition-colors border-b-border">
      <TableCell className="py-2 pl-3 font-medium">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-sm">
            {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
          </div>
          <div>
            <p>{student.first_name} {student.last_name}</p>
            <p className="text-xs text-muted-foreground font-normal sm:hidden">{student.enrollment_number}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden py-2 text-muted-foreground sm:table-cell">{student.enrollment_number}</TableCell>
      <TableCell className="py-2 pr-3 text-right">
        {hasPaid ? (
          <Badge className="border-0 bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-600">
            Paid
          </Badge>
        ) : (
          <Badge className="border-0 bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-600">
            Unpaid
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
};
