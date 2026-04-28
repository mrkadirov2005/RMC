// Page component for the finance screen in the crm feature.

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchClasses as fetchClassesThunk } from '@/slices/classesSlice';
import { fetchStudents as fetchStudentsThunk } from '@/slices/studentsSlice';
import { fetchPayments as fetchPaymentsThunk } from '@/slices/paymentsSlice';
import { fetchTeachers as fetchTeachersThunk } from '@/slices/teachersSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  payment_amount: number;
  teacher_id: number;
}

interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  class_id: number;
}

interface Payment {
  payment_id?: number;
  id?: number;
  student_id: number;
  center_id?: number;
  amount: number;
  payment_date: string;
  payment_status?: string;
  currency?: string;
  payment_method?: string;
  transaction_reference?: string;
  receipt_number?: string;
  payment_type?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Renders the teacher finance detail page screen.
const TeacherFinanceDetailPage: React.FC = () => {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));

  const dispatch = useAppDispatch();
  const teachers = useAppSelector((state) => state.teachers.items) as Array<{
    teacher_id?: number;
    id?: number;
    first_name?: string;
    last_name?: string;
  }>;
  const isLoadingTeachers = useAppSelector((state) => state.teachers.loading);
  const classes = useAppSelector((state) => state.classes.items) as Class[];
  const isLoadingClasses = useAppSelector((state) => state.classes.loading);
  const students = useAppSelector((state) => state.students.items) as Student[];
  const isLoadingStudents = useAppSelector((state) => state.students.loading);
  const payments = useAppSelector((state) => state.payments.items) as Payment[];
  const isLoadingPayments = useAppSelector((state) => state.payments.loading);

// Memoizes the teacher derived value.
  const teacher = useMemo(
    () => teachers.find((item) => Number(item.teacher_id || item.id) === Number(teacherId)) || null,
    [teacherId, teachers]
  );

// Runs side effects for this component.
  useEffect(() => {
    if (teacherId) {
      dispatch(fetchTeachersThunk());
      dispatch(fetchClassesThunk());
      dispatch(fetchStudentsThunk());
      dispatch(fetchPaymentsThunk());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  // Filter classes taught by this teacher
  const teacherClasses = useMemo(() => {
    return classes.filter((c: Class) => c.teacher_id === Number(teacherId));
  }, [classes, teacherId]);

  // Calculate payment data
  const paymentData = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    const classPayments: Record<string, any> = {};
    let totalEarnings = 0;

    teacherClasses.forEach((cls: Class) => {
      const classId = cls.class_id || cls.id || 0;
      const classStudents = students.filter((s: Student) => s.class_id === classId);
      
      const studentPayments: any[] = [];
      let classEarnings = 0;

      classStudents.forEach((student: Student) => {
        const studentId = student.student_id || student.id;
        const studentPaymentRecords = payments.filter((p: Payment) => {
          const pId = p.student_id === studentId;
          if (!pId) return false;
          
          // Parse payment_date to extract month and year
          if (p.payment_date) {
            const paymentDate = new Date(p.payment_date);
            const paymentMonth = paymentDate.getMonth() + 1; // getMonth returns 0-11
            const paymentYear = paymentDate.getFullYear();
            return paymentMonth === monthNum && paymentYear === yearNum;
          }
          return false;
        });

        const isPaid = studentPaymentRecords.length > 0;
        const paidAmount = studentPaymentRecords.reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);

        if (isPaid) {
          classEarnings += paidAmount;
          totalEarnings += paidAmount;
        }

        studentPayments.push({
          student,
          isPaid,
          paidAmount,
          expectedAmount: cls.payment_amount,
          records: studentPaymentRecords,
        });
      });

      classPayments[classId] = {
        class: cls,
        students: studentPayments,
        classEarnings,
        totalStudents: classStudents.length,
        paidCount: studentPayments.filter((sp) => sp.isPaid).length,
      };
    });

    return { classPayments, totalEarnings };
  }, [selectedMonth, teacherClasses, students, payments]);

  if (isLoadingTeachers || isLoadingClasses || isLoadingStudents || isLoadingPayments) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/finance')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-green-600" />
          {teacher?.first_name} {teacher?.last_name} - Finance
        </h1>
      </div>

      {/* Month Selector */}
      <div className="flex gap-4">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white dark:bg-slate-950 text-black dark:text-white border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Total Earnings Card */}
      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-400">Total Earnings This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-green-600 dark:text-green-400">
            {/* {Number(paymentData.totalEarnings.split(".")[0])} */}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Across {Object.keys(paymentData.classPayments).length} classes
          </p>
        </CardContent>
      </Card>

      {/* Classes and Payments */}
      <Tabs defaultValue={Object.keys(paymentData.classPayments)[0]} className="w-full">
        <TabsList className="w-full justify-start">
          {Object.entries(paymentData.classPayments).map(([classId, data]) => (
            <TabsTrigger key={classId} value={classId}>
              {data.class.class_name}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(paymentData.classPayments).map(([classId, classData]) => (
          <TabsContent key={classId} value={classId} className="space-y-4">
            {/* Class Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Class Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${Number(classData.classEarnings).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Paid Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {classData.paidCount}/{classData.totalStudents}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">
                    ${((classData.totalStudents - classData.paidCount) * classData.class.payment_amount).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle className="dark:text-white">Student Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classData.students.map((studentPayment: any) => (
                    <div
                      key={studentPayment.student.student_id || studentPayment.student.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 border-gray-200 dark:border-slate-700"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-black dark:text-white">
                          {studentPayment.student.first_name} {studentPayment.student.last_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {studentPayment.student.enrollment_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${Number(studentPayment.expectedAmount).toFixed(2)}</p>
                        {studentPayment.isPaid ? (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Paid: ${Number(studentPayment.paidAmount).toFixed(2)}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                            <XCircle className="h-4 w-4" />
                            Not Paid
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TeacherFinanceDetailPage;
