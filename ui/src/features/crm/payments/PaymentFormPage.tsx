import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, BadgePercent, CheckCircle2, ChevronLeft, ChevronRight, Loader2, ReceiptText, Save, Search, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/common/PageHeader';
import { SelectField } from '../students/components/SelectField';
import { useAppDispatch, useAppSelector } from '../hooks';
import { fetchCenters } from '@/slices/centersSlice';
import { fetchClasses } from '@/slices/classesSlice';
import { selectCenterOptions, selectClassItems } from '@/store/selectors';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { discountAPI, paymentAPI, studentAPI } from './api';
import { paymentMethodOptions, paymentStatusOptions, paymentTypeOptions } from '@/utils/dropdownOptions';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Class, Payment, Student } from './types';

const defaultPayment = (centerId: number): Partial<Payment> => ({
  center_id: centerId,
  currency: 'UZS',
  payment_method: 'Cash',
  payment_type: 'Tuition',
  status: 'Completed',
  payment_date: new Date().toISOString().slice(0, 10),
});

const getStudentId = (student: Student) => Number(student.student_id || student.id || 0);
const getStudentLabel = (student: Student) =>
  `${student.first_name || ''} ${student.last_name || ''}`.trim() || `Student #${getStudentId(student)}`;
const createUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};
const findStudentClass = (classes: Class[], student: Student | null) => {
  const classId = Number(student?.class_id || 0);
  if (!classId) return null;
  return classes.find((cls) => Number(cls.class_id || cls.id || 0) === classId) || null;
};
const getClassPaymentAmount = (studentClass: Class | null) => Number(studentClass?.payment_amount || 0);
const getRows = <T,>(response: any): T[] => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.payments)) return payload.payments;
  return [];
};
const getResponseData = <T,>(response: any): T | null => {
  const payload = response?.data ?? response;
  return (payload?.data ?? payload) || null;
};
const getMonthStart = (value = new Date()) => new Date(value.getFullYear(), value.getMonth(), 1);
const addMonths = (value: Date, months: number) => new Date(value.getFullYear(), value.getMonth() + months, 1);
const getMonthKey = (value: Date | string | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const getMonthLabel = (value: Date) => value.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
const getSixMonthWindow = (endMonth: Date) =>
  Array.from({ length: 6 }, (_, index) => addMonths(endMonth, index - 5));
const isPaidPayment = (payment: Partial<Payment>) => {
  const status = String(payment.status || payment.payment_status || '').trim().toLowerCase();
  return status === 'completed' || status === 'paid';
};
const getMonthPaymentState = (payments: Partial<Payment>[], expectedAmount: number) => {
  const paidAmount = payments
    .filter(isPaidPayment)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  if (paidAmount <= 0) return 'none';
  if (expectedAmount > 0 && paidAmount < expectedAmount) return 'partial';
  return 'full';
};
const getMonthPaymentStatus = (state: string) => {
  if (state === 'full') {
    return { label: 'Fully done', className: 'bg-emerald-600 text-white' };
  }
  if (state === 'partial') {
    return { label: 'Partly done', className: 'bg-amber-500 text-white' };
  }
  return { label: 'None', className: 'bg-rose-600 text-white' };
};

const PaymentFormPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { paymentId } = useParams<{ paymentId: string }>();
  const isEditing = Boolean(paymentId);
  const { user } = useAppSelector((state) => state.auth);
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const centerOptions = useAppSelector(selectCenterOptions);
  const classes = useAppSelector(selectClassItems) as Class[];
  const centersLoading = useAppSelector((state) => state.centers.loading);
  const defaultCenterId = getResolvedCenterId(user) ?? 0;
  const [formData, setFormData] = useState<Partial<Payment>>(defaultPayment(defaultCenterId));
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDiscount, setActiveDiscount] = useState<any>(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<Partial<Payment>[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [historyWindowEnd, setHistoryWindowEnd] = useState(() => getMonthStart());

  const originalAmount = Number(formData.original_amount ?? formData.amount ?? 0);
  const selectedClass = useMemo(() => findStudentClass(classes, selectedStudent), [classes, selectedStudent]);
  const discountValue = Number(formData.discount_value || 0);
  const discountAmount = useMemo(() => {
    if (!formData.discount_kind || originalAmount <= 0) return 0;
    if (formData.discount_value_type === 'percent') {
      return Math.min(originalAmount, (originalAmount * Math.min(discountValue, 100)) / 100);
    }
    return Math.min(originalAmount, discountValue);
  }, [discountValue, formData.discount_kind, formData.discount_value_type, originalAmount]);
  const finalAmount = Math.max(0, originalAmount - discountAmount);
  const historyMonths = useMemo(() => getSixMonthWindow(historyWindowEnd), [historyWindowEnd]);
  const historyPaymentsByMonth = useMemo(() => {
    const monthKeys = new Set(historyMonths.map(getMonthKey));
    const map = new Map<string, Partial<Payment>[]>();
    paymentHistory
      .filter((payment) => monthKeys.has(getMonthKey(payment.payment_date)))
      .forEach((payment) => {
        const key = getMonthKey(payment.payment_date);
        const rows = map.get(key) || [];
        rows.push(payment);
        map.set(key, rows);
      });
    for (const rows of map.values()) {
      rows.sort((a, b) => String(b.payment_date || '').localeCompare(String(a.payment_date || '')));
    }
    return map;
  }, [historyMonths, paymentHistory]);
  const canMoveHistoryForward = getMonthKey(historyWindowEnd) < getMonthKey(getMonthStart());
  const expectedMonthlyPayment = Number(selectedClass?.payment_amount || formData.original_amount || formData.amount || 0);

  useEffect(() => {
    if (isOwner) dispatch(fetchCenters());
    dispatch(fetchClasses());
  }, [dispatch, isOwner]);

  useEffect(() => {
    if (!isEditing || !paymentId) return;
    let alive = true;
    const loadPayment = async () => {
      try {
        setLoadingPayment(true);
        setError(null);
        const response = await paymentAPI.getById(Number(paymentId));
        const payment = (response as any).data || response;
        if (!alive) return;
        setFormData({
          ...defaultPayment(defaultCenterId),
          ...payment,
          status: payment.status || payment.payment_status || 'Completed',
          reference_number: payment.reference_number || payment.transaction_reference || '',
        });
        if (payment.student_id) {
          const studentResponse = await studentAPI.getById(Number(payment.student_id));
          if (alive) setSelectedStudent((studentResponse as any).data || studentResponse);
        }
      } catch (err: any) {
        if (alive) setError(err?.response?.data?.error || err?.message || 'Failed to load payment.');
      } finally {
        if (alive) setLoadingPayment(false);
      }
    };
    loadPayment();
    return () => {
      alive = false;
    };
  }, [defaultCenterId, isEditing, paymentId]);

  useEffect(() => {
    if (isEditing || !selectedStudent) return;
    const classAmount = Number(selectedClass?.payment_amount || 0);
    if (classAmount <= 0) return;
    setFormData((current) => {
      if (Number(current.amount || current.original_amount || 0) > 0) return current;
      return { ...current, amount: classAmount, original_amount: current.discount_kind ? classAmount : current.original_amount };
    });
  }, [isEditing, selectedClass, selectedStudent]);

  useEffect(() => {
    if (isEditing) return;
    setFormData((current) => ({ ...current, center_id: current.center_id || defaultCenterId }));
  }, [defaultCenterId, isEditing]);

  useEffect(() => {
    const studentId = selectedStudent ? getStudentId(selectedStudent) : 0;
    if (!studentId) {
      setPaymentHistory([]);
      setPaymentHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setPaymentHistory([]);
    setPaymentHistoryLoading(true);
    paymentAPI
      .getByStudent(studentId, { _fresh: Date.now() })
      .then((response) => {
        if (!cancelled) setPaymentHistory(getRows<Partial<Payment>>(response));
      })
      .catch(() => {
        if (!cancelled) setPaymentHistory([]);
      })
      .finally(() => {
        if (!cancelled) setPaymentHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStudent]);

  useEffect(() => {
    const query = studentSearch.trim();
    if (query.length < 2) {
      setStudentResults([]);
      setStudentSearching(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        setStudentSearching(true);
        const response = await studentAPI.getAll({ q: query, page: 1, limit: 10 });
        const payload = (response as any).data || response;
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setStudentResults(rows);
      } catch {
        setStudentResults([]);
      } finally {
        setStudentSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  useEffect(() => {
    if (isEditing || !formData.student_id) {
      if (!formData.student_id) setActiveDiscount(null);
      return;
    }
    let cancelled = false;
    setLoadingDiscount(true);
    Promise.allSettled([
      discountAPI.getActiveByStudent(Number(formData.student_id), { discount_kind: 'monthly_discount' }),
      discountAPI.getActiveSerialByStudent(Number(formData.student_id)),
    ])
      .then(([monthlyResult, serialResult]) => {
        if (cancelled) return;
        const monthlyDiscount = monthlyResult.status === 'fulfilled'
          ? getResponseData<any>(monthlyResult.value)
          : null;
        const serialDiscount = serialResult.status === 'fulfilled'
          ? getResponseData<any>(serialResult.value)
          : null;
        const discount = monthlyDiscount || serialDiscount;
        setActiveDiscount(discount);
        if (discount) {
          setFormData((current) => ({
            ...current,
            discount_id: discount.discount_id,
            discount_kind: discount.discount_kind || 'serial_discount',
            discount_value_type: discount.discount_type || 'fixed',
            discount_value: Number(discount.value || 0),
            original_amount: Number(current.original_amount || current.amount || discount.original_price || 0),
          }));
        } else if (monthlyResult.status === 'fulfilled' || serialResult.status === 'fulfilled') {
          setFormData((current) => ({
            ...current,
            discount_id: null,
            discount_kind: null,
            discount_value_type: null,
            discount_value: 0,
            discount_amount: 0,
            final_amount: undefined,
          }));
        } else {
          setError('Failed to load the active discount. Please try selecting the student again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDiscount(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.student_id, isEditing]);

  useEffect(() => {
    if (!formData.discount_kind) return;
    setFormData((current) => ({
      ...current,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      is_complete: Number(current.amount || 0) >= finalAmount,
    }));
  }, [discountAmount, finalAmount, formData.discount_kind]);

  const clearDiscount = () => {
    setActiveDiscount(null);
    setFormData((current) => ({
      ...current,
      discount_id: null,
      discount_kind: null,
      discount_value_type: null,
      discount_value: 0,
      discount_amount: 0,
      final_amount: undefined,
      original_amount: undefined,
    }));
  };

  const selectStudent = (student: Student) => {
    const studentId = getStudentId(student);
    const studentClass = findStudentClass(classes, student);
    const classAmount = getClassPaymentAmount(studentClass);
    setSelectedStudent(student);
    setStudentSearch('');
    setStudentResults([]);
    setFormData((current) => {
      const nextAmount = classAmount || Number(current.amount || current.original_amount || 0) || 0;
      const transactionReference = current.transaction_reference || current.reference_number || createUuid();
      return {
        ...current,
        student_id: studentId,
        center_id: student.center_id || current.center_id || defaultCenterId,
        student_class_id: student.class_id,
        student_teacher_id: student.teacher_id,
        amount: nextAmount,
        original_amount: nextAmount,
        discount_id: null,
        discount_kind: null,
        discount_value_type: null,
        discount_value: 0,
        discount_amount: 0,
        final_amount: undefined,
        currency: current.currency || 'UZS',
        payment_method: current.payment_method || 'Cash',
        payment_type: current.payment_type || 'Tuition',
        status: current.status || 'Completed',
        payment_status: current.payment_status || current.status || 'Completed',
        receipt_number: current.receipt_number || createUuid(),
        reference_number: current.reference_number || transactionReference,
        transaction_reference: transactionReference,
      };
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const hasDiscount = Boolean(formData.discount_kind && Number(formData.discount_amount || 0) > 0);
    const amount = hasDiscount && formData.final_amount != null ? Number(formData.final_amount) : Number(formData.amount || 0);
    const transactionReference = formData.transaction_reference || formData.reference_number || createUuid();
    const payload = {
      ...formData,
      amount,
      original_amount: hasDiscount ? Number(formData.original_amount || formData.amount || 0) : amount,
      center_id: formData.center_id ?? defaultCenterId,
      currency: formData.currency || 'UZS',
      payment_method: formData.payment_method || 'Cash',
      payment_type: formData.payment_type || 'Tuition',
      status: formData.status || formData.payment_status || 'Completed',
      payment_status: formData.payment_status || formData.status || 'Completed',
      receipt_number: formData.receipt_number || createUuid(),
      reference_number: formData.reference_number || transactionReference,
      transaction_reference: transactionReference,
    };
    try {
      setSaving(true);
      setError(null);
      if (isEditing && paymentId) {
        await paymentAPI.update(Number(paymentId), payload);
        showToast.success('Payment updated successfully!');
      } else {
        await paymentAPI.create(payload);
        showToast.success('Payment created successfully!');
      }
      navigate('/payments');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.details || err?.message || 'Failed to save payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto space-y-5">
      <PageHeader
        title={isEditing ? t('Edit Payment') : t('Add Payment')}
        description={t('Record a payment with student search, discount handling, receipt details, and payment status.')}
        icon={ReceiptText}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/payments')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('Back')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>
        )}

        {loadingPayment ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border bg-card">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('Loading...')}
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-lg border bg-card shadow-sm">
              <div className="border-b px-4 py-3">
                <h2 className="text-base font-semibold">{isEditing ? t('Student and amount') : t('Student and date')}</h2>
                <p className="text-sm text-muted-foreground">
                  {isEditing
                    ? t('Search by student name, then enter the payment amount and date.')
                    : t('Choose the student and payment date. The receipt data is filled automatically.')}
                </p>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {isOwner && isEditing && (
                  <SelectField
                    label="Center"
                    name="center_id"
                    value={formData.center_id || ''}
                    onChange={(value) => setFormData((current) => ({ ...current, center_id: Number(value) }))}
                    options={centerOptions}
                    isLoading={centersLoading}
                    disabled={Boolean(selectedStudent?.center_id)}
                    required
                    placeholder={selectedStudent?.center_id ? t('Center from selected student') : t('Select a center')}
                  />
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('Student')} *</Label>
                  {selectedStudent && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">{getStudentLabel(selectedStudent)}</p>
                          <p className="text-xs text-muted-foreground">
                            ID {getStudentId(selectedStudent)}
                            {selectedStudent.class_name ? ` / ${selectedStudent.class_name}` : ''}
                            {selectedStudent.phone ? ` / ${selectedStudent.phone}` : ''}
                          </p>
                        </div>
                      </div>
                      {!isEditing && (
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setSelectedStudent(null);
                          setFormData((current) => ({ ...current, student_id: undefined }));
                          clearDiscount();
                        }}>
                          {t('Change')}
                        </Button>
                      )}
                    </div>
                  )}
                  {!selectedStudent && (
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder={t('Search student by name...')}
                        className="pl-9"
                        autoComplete="off"
                      />
                      <div className="mt-2 rounded-lg border bg-background">
                        {studentSearch.trim().length < 2 ? (
                          <div className="px-3 py-3 text-sm text-muted-foreground">{t('Type at least 2 characters.')}</div>
                        ) : studentSearching ? (
                          <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('Loading...')}
                          </div>
                        ) : studentResults.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-muted-foreground">{t('No students found')}</div>
                        ) : (
                          <div className="max-h-72 overflow-y-auto p-1">
                            {studentResults.map((student) => (
                              <button
                                key={getStudentId(student)}
                                type="button"
                                onClick={() => selectStudent(student)}
                                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                              >
                                <span className="font-medium">{getStudentLabel(student)}</span>
                                <span className="text-xs text-muted-foreground">ID {getStudentId(student)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {selectedStudent && (
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">{t('Payment history')}</h3>
                        <p className="text-xs text-muted-foreground">
                          {getMonthLabel(historyMonths[0])} - {getMonthLabel(historyMonths[historyMonths.length - 1])}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setHistoryWindowEnd((current) => addMonths(current, -6))}
                          aria-label="Previous six months"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setHistoryWindowEnd((current) => addMonths(current, 6))}
                          disabled={!canMoveHistoryForward}
                          aria-label="Next six months"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                      <Table className="text-xs">
                        <TableHeader className="bg-slate-50/90 dark:bg-muted/30">
                          <TableRow>
                            {historyMonths.map((month) => (
                              <TableHead key={getMonthKey(month)} className="h-8 px-2 text-center">
                                {getMonthLabel(month)}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentHistoryLoading ? (
                            <TableRow>
                              <TableCell colSpan={historyMonths.length} className="py-6 text-center text-muted-foreground">
                                <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />
                                {t('Loading...')}
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow>
                              {historyMonths.map((month) => {
                                const rows = historyPaymentsByMonth.get(getMonthKey(month)) || [];
                                const state = getMonthPaymentState(rows, expectedMonthlyPayment);
                                const status = getMonthPaymentStatus(state);
                                return (
                                  <TableCell key={getMonthKey(month)} className="px-2 py-3 text-center">
                                    <span className={`inline-flex min-w-[92px] justify-center rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm ${status.className}`}>
                                      {status.label}
                                    </span>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                {(isEditing || selectedStudent) && (
                  <div className="space-y-2">
                    <Label htmlFor="amount">{formData.discount_kind ? 'Original amount *' : `${t('Amount')} *`}</Label>
                    <Input
                      type="number"
                      id="amount"
                      required
                      step="0.01"
                      min="0"
                      value={formData.original_amount ?? formData.amount ?? ''}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setFormData((current) => ({ ...current, amount: value, original_amount: value }));
                      }}
                    />
                    {selectedClass?.payment_amount != null && (
                      <p className="text-xs text-muted-foreground">
                        Filled from {selectedClass.class_name || 'selected group'} monthly fee. You can edit it for this payment.
                      </p>
                    )}
                  </div>
                )}
                {(isEditing || selectedStudent) && (
                  <div className="space-y-2">
                    <Label htmlFor="payment_date">{t('Payment Date')} *</Label>
                    <Input
                      type="date"
                      id="payment_date"
                      required
                      value={formData.payment_date || ''}
                      onChange={(e) => setFormData((current) => ({ ...current, payment_date: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </section>

            {(isEditing || selectedStudent) && (
            <section className="rounded-lg border border-sky-200 bg-sky-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-bold text-sky-900">Discount</Label>
                  <p className="text-xs text-sky-700">
                    {loadingDiscount
                      ? 'Checking active discounts...'
                      : activeDiscount
                        ? `${activeDiscount.discount_kind === 'monthly_discount' ? 'One-month' : 'Serial'} discount is applied automatically.`
                        : 'Use a monthly discount only for this payment.'}
                  </p>
                </div>
                {formData.discount_kind === 'serial_discount' ? (
                  <Button type="button" variant="outline" size="sm" onClick={clearDiscount}>
                    Remove
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-sky-800">Monthly</span>
                    <Switch
                      checked={formData.discount_kind === 'monthly_discount'}
                      onCheckedChange={(checked) =>
                        checked
                          ? setFormData((current) => ({
                              ...current,
                              discount_kind: 'monthly_discount',
                              discount_value_type: 'fixed',
                              discount_value: 0,
                            }))
                          : clearDiscount()
                      }
                    />
                  </div>
                )}
              </div>
              {formData.discount_kind && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <SelectField
                    label="Discount type"
                    name="discount_value_type"
                    value={formData.discount_value_type || 'fixed'}
                    onChange={(value) =>
                      setFormData((current) => ({ ...current, discount_value_type: value as 'percent' | 'fixed' }))
                    }
                    options={[
                      { label: 'Fixed', value: 'fixed' },
                      { label: 'Percent', value: 'percent' },
                    ]}
                  />
                  <div className="space-y-2">
                    <Label>Discount value</Label>
                    <Input
                      type="number"
                      min="0"
                      max={formData.discount_value_type === 'percent' ? 100 : undefined}
                      step="0.01"
                      value={formData.discount_value || ''}
                      disabled={Boolean(formData.discount_id)}
                      onChange={(e) => setFormData((current) => ({ ...current, discount_value: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount amount</Label>
                    <Input readOnly value={discountAmount.toFixed(2)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Final payable</Label>
                    <Input readOnly value={finalAmount.toFixed(2)} />
                  </div>
                </div>
              )}
            </section>
            )}

            {isEditing && (
            <section className="rounded-lg border bg-card shadow-sm">
              <div className="border-b px-4 py-3">
                <h2 className="text-base font-semibold">{t('Receipt details')}</h2>
                <p className="text-sm text-muted-foreground">{t('Payment method, type, status, receipt, and notes.')}</p>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <SelectField label={t('Payment Method')} name="payment_method" value={formData.payment_method || ''} onChange={(value) => setFormData((current) => ({ ...current, payment_method: value }))} options={paymentMethodOptions} required placeholder={t('Select method')} />
                <SelectField label={t('Payment Type')} name="payment_type" value={formData.payment_type || ''} onChange={(value) => setFormData((current) => ({ ...current, payment_type: value }))} options={paymentTypeOptions} required placeholder={t('Select type')} />
                <SelectField label="Status" name="status" value={formData.status || ''} onChange={(value) => setFormData((current) => ({ ...current, status: value }))} options={paymentStatusOptions} required placeholder={t('Select status')} />
                <div className="space-y-2">
                  <Label htmlFor="receipt_number">{t('Receipt Number')} *</Label>
                  <Input id="receipt_number" required value={formData.receipt_number || ''} onChange={(e) => setFormData((current) => ({ ...current, receipt_number: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference_number">{t('Reference Number')}</Label>
                  <Input id="reference_number" value={formData.reference_number || ''} onChange={(e) => setFormData((current) => ({ ...current, reference_number: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">{t('Notes')}</Label>
                  <Textarea id="notes" value={formData.notes || ''} onChange={(e) => setFormData((current) => ({ ...current, notes: e.target.value }))} placeholder={t('Additional notes...')} />
                </div>
              </div>
            </section>
            )}

            {isEditing && (
            <section className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold"><UserRound className="h-4 w-4 text-sky-600" />{t('Student')}</div>
                <p className="mt-2 text-sm text-muted-foreground">{selectedStudent ? getStudentLabel(selectedStudent) : t('Not selected')}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold"><BadgePercent className="h-4 w-4 text-emerald-600" />{t('Discount')}</div>
                <p className="mt-2 text-sm text-muted-foreground">{formData.discount_kind || t('No discount')}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-rose-600" />{t('Status')}</div>
                <p className="mt-2 text-sm text-muted-foreground">{formData.status || t('Not set')}</p>
              </div>
            </section>
            )}

            <div className="sticky bottom-3 z-10 flex justify-end gap-2 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
              <Button type="button" variant="outline" onClick={() => navigate('/payments')} disabled={saving}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={saving || !formData.student_id} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? t('Saving...') : t('Save')}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default PaymentFormPage;
