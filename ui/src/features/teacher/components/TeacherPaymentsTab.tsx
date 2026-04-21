import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wallet, Calendar, Loader2, GraduationCap } from 'lucide-react';
import { paymentAPI, classAPI, studentAPI } from '../../../shared/api/api';

interface TeacherPaymentsTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

export default function TeacherPaymentsTab({ teacherId }: TeacherPaymentsTabProps) {
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payments, setPayments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [classesRes, studentsRes, paymentsRes] = await Promise.all([
          classAPI.getAll().catch(() => ({ data: [] })),
          studentAPI.getAll().catch(() => ({ data: [] })),
          paymentAPI.getAll().catch(() => ({ data: [] })),
        ]);
        
        const allClasses = classesRes.data || [];
        const allStudents = studentsRes.data || [];
        const allPayments = paymentsRes.data || [];

        const scopedClasses = teacherId
          ? allClasses.filter((c: any) => Number(c.teacher_id) === Number(teacherId))
          : allClasses;
          
        const teacherClassIds = new Set(scopedClasses.map((c: any) => Number(c.class_id || c.id)));
        
        const scopedStudents = allStudents.filter((s: any) => teacherClassIds.has(Number(s.class_id)));
        
        setClasses(scopedClasses);
        setStudents(scopedStudents);
        setPayments(Array.isArray(allPayments) ? allPayments : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [teacherId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStudentsByClass = (classId: number) => {
    return students.filter(s => Number(s.class_id) === Number(classId));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center sm:flex-row flex-col sm:items-center gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-indigo-500" />
          Student Payments Tracker
        </h3>
        <div className="flex items-center gap-3">
          <Label htmlFor="payment-month-teacher" className="font-semibold whitespace-nowrap">Select Month:</Label>
          <div className="relative">
            <Input
              id="payment-month-teacher"
              type="month"
              value={selectedPaymentMonth}
              onChange={(e) => setSelectedPaymentMonth(e.target.value)}
              className="w-[180px] pl-10"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="h-16 w-16 mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-semibold">No classes found</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((classItem) => {
            const classId = classItem.class_id || classItem.id || 0;
            const classStudents = getStudentsByClass(classId);
            
            return (
              <div key={classId} className="rounded-2xl border shadow-sm overflow-hidden bg-card text-card-foreground hover:shadow-md transition-shadow duration-300">
                <div className="bg-gradient-to-r from-indigo-50/50 dark:from-indigo-950/30 to-card p-5 border-b relative">
                  <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-indigo-100/30 dark:from-indigo-900/20 to-transparent pointer-events-none" />
                  <h4 className="text-lg font-bold text-foreground flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-background rounded-lg text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900">
                         <GraduationCap className="h-5 w-5" />
                       </div>
                       <span>{classItem.class_name} <span className="text-muted-foreground text-sm font-normal ml-2 hidden sm:inline">({classItem.level})</span></span>
                    </div>
                    <Badge variant="secondary" className="bg-background hover:bg-muted shadow-sm border">{classStudents.length} Students</Badge>
                  </h4>
                </div>
                <div className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b-border">
                        <TableHead className="font-semibold text-foreground pl-6">Student</TableHead>
                        <TableHead className="font-semibold text-foreground hidden sm:table-cell">Enrollment #</TableHead>
                        <TableHead className="font-semibold text-foreground text-right pr-6">Payment Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No students</TableCell>
                        </TableRow>
                      ) : (
                        classStudents.map((student) => {
                          const studentId = student.student_id || student.id;
                          const [year, month] = selectedPaymentMonth.split('-');
                          const hasPaid = payments.some(p => {
                            if (Number(p.student_id) !== Number(studentId)) return false;
                            if (p.payment_status?.toLowerCase() !== 'completed') return false;
                            const pDate = new Date(p.payment_date);
                            return pDate.getFullYear() === parseInt(year) && (pDate.getMonth() + 1) === parseInt(month);
                          });

                          return (
                            <TableRow key={studentId} className="hover:bg-muted/50 transition-colors border-b-border">
                              <TableCell className="pl-6 font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 dark:from-indigo-900/50 to-purple-100 dark:to-purple-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0 border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
                                    {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p>{student.first_name} {student.last_name}</p>
                                    <p className="text-xs text-muted-foreground font-normal sm:hidden">{student.enrollment_number}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground hidden sm:table-cell">{student.enrollment_number}</TableCell>
                              <TableCell className="text-right pr-6">
                                {hasPaid ? (
                                  <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20 px-3 py-1 shadow-sm font-semibold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" /> Paid
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border-rose-200 dark:border-rose-500/20 px-3 py-1 shadow-sm font-semibold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2" /> Unpaid
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
