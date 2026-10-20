// Tab component for the crm feature.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Loader2, Plus, Undo2, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/utils/helpers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { classAPI, discountAPI, studentAPI, teacherAPI } from '../api';
import {
  getAssignableClasses,
  getAssignableTeachers,
  getClassId,
  getTeacherClasses,
  describeDiscount,
  isUndoableAddedGroup,
  type ClassOption,
  type CopyableDiscount,
  type StudentGroupRecord,
  type TeacherOption,
} from './groupsTabModel';

interface StudentGroupsResponse {
  main_student_id: number;
  total_coins: number;
  groups: StudentGroupRecord[];
}

interface GroupsTabProps {
  studentId: number;
  onOpenStudent: (studentId: number) => void;
}

// Shows every group the child attends under one login and adds them to another group.
export const GroupsTab = ({ studentId, onOpenStudent }: GroupsTabProps) => {
  const { t } = useLanguage();
  const [data, setData] = useState<StudentGroupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  // As in the transfer dialog: pick the teacher first, then one of that teacher's groups.
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assigning, setAssigning] = useState(false);
  // First day in the new group (Tashkent date); the first month is billed from it.
  const [startDate, setStartDate] = useState('');
  const [note, setNote] = useState('');
  // The child's active discounts in their groups; the checked ones are repeated in the new group.
  const [discounts, setDiscounts] = useState<CopyableDiscount[]>([]);
  const [copyDiscountIds, setCopyDiscountIds] = useState<number[]>([]);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await studentAPI.getGroups(studentId);
      setData(getApiPayload<StudentGroupsResponse>(response));
    } catch (err) {
      setError(getErrorMessage(err) || t("Couldn't load the student's groups"));
    } finally {
      setLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const groups = useMemo(() => data?.groups || [], [data]);
  const assignableClasses = useMemo(() => getAssignableClasses(classes, groups), [classes, groups]);
  const teacherChoices = useMemo(() => getAssignableTeachers(assignableClasses, teachers), [assignableClasses, teachers]);
  const teacherClasses = useMemo(
    () => (selectedTeacherId === '' ? [] : getTeacherClasses(assignableClasses, Number(selectedTeacherId))),
    [assignableClasses, selectedTeacherId]
  );

  const openAssignDialog = async () => {
    setSelectedTeacherId('');
    setSelectedClassId('');
    setStartDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date()));
    setNote('');
    setDiscounts([]);
    setCopyDiscountIds([]);
    setDialogOpen(true);
    const activeGroups = groups.filter((group) => group.status !== 'Transferred');
    void Promise.all(activeGroups.map((group) => discountAPI.getActiveByStudent(group.student_id).then((response) => ({ group, row: getApiPayload<any>(response) })).catch(() => null)))
      .then((results) => {
        const found: CopyableDiscount[] = [];
        results.forEach((result) => {
          if (result?.row?.discount_id) found.push({ ...result.row, group_name: result.group.class_name || '' });
        });
        setDiscounts(found);
      });
    try {
      const [classResponse, teacherResponse] = await Promise.all([classAPI.getAll(), teacherAPI.getAll()]);
      setClasses(unwrapApiRows<ClassOption>(classResponse));
      setTeachers(unwrapApiRows<TeacherOption>(teacherResponse));
    } catch (err) {
      showToast.error(getErrorMessage(err) || t("Couldn't load groups"));
    }
  };

  const assignToGroup = async () => {
    if (!selectedClassId || !startDate) return;
    setAssigning(true);
    try {
      const response = await studentAPI.assignToGroup(studentId, Number(selectedClassId), {
        start_date: startDate,
        note: note.trim() || undefined,
        copy_discount_ids: copyDiscountIds,
      });
      const copied = Number(getApiPayload<any>(response)?.copied_discounts || 0);
      showToast.success(copied > 0 ? t('Student added to the new group with {count} discount(s)', { count: copied }) : t('Student added to the new group'));
      setDialogOpen(false);
      await loadGroups();
    } catch (err) {
      showToast.error(getErrorMessage(err) || t("Couldn't add the student to the group"));
    } finally {
      setAssigning(false);
    }
  };

  const removeAddedGroup = async (recordId: number, groupName: string) => {
    if (!window.confirm(t('Remove the student from {group}? Use this only if they were added by mistake.', { group: groupName }))) return;
    setRemovingId(recordId);
    try {
      await studentAPI.removeAddedGroup(recordId);
      showToast.success(t('Removed from the group'));
      // The record on screen may be the one just removed.
      if (recordId === Number(studentId) && data?.main_student_id) onOpenStudent(Number(data.main_student_id));
      else await loadGroups();
    } catch (err) {
      showToast.error(getErrorMessage(err) || t("Couldn't remove the student from the group"));
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border border-slate-200 shadow-sm dark:border-border">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 p-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> {t('Groups')}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t('The student signs in once with the same username and password and sees every group.')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Coins className="h-3.5 w-3.5" /> {t('Total coins: {count}', { count: Number(data?.total_coins || 0) })}
            </Badge>
            <Button size="sm" className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={() => void openAssignDialog()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('Assign to new group')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Group')}</TableHead>
                <TableHead>{t('Teacher')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead className="text-right">{t('Coins')}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const teacherName = [group.teacher_first_name, group.teacher_last_name].filter(Boolean).join(' ');
                const isCurrent = Number(group.student_id) === Number(studentId);
                return (
                  <TableRow key={group.student_id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        {group.class_name || t('No group')}
                        {group.is_main && <Badge className="bg-sky-600 text-white hover:bg-sky-600">{t('Main account')}</Badge>}
                      </div>
                      {(group.start_date || group.group_note) && (
                        <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                          {[group.start_date && t('From {date}', { date: String(group.start_date).slice(0, 10) }), group.group_note].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{teacherName || '-'}</TableCell>
                    <TableCell>{group.status ? t(group.status) : '-'}</TableCell>
                    <TableCell className="text-right">{Number(group.coins || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                      {isUndoableAddedGroup(group) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-rose-600 hover:text-rose-700"
                          disabled={removingId !== null}
                          onClick={() => void removeAddedGroup(group.student_id, group.class_name || '')}
                        >
                          {removingId === group.student_id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Undo2 className="mr-1 h-3.5 w-3.5" />}
                          {t('Remove from group')}
                        </Button>
                      )}
                      {isCurrent ? (
                        <span className="text-xs text-muted-foreground">{t('Open now')}</span>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpenStudent(group.student_id)}>
                          {t('Open')}
                        </Button>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Assign to new group')}</DialogTitle>
            <DialogDescription>
              {t('A new record is created in the chosen group. The student keeps the same username and password.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="assign-teacher">{t('Teacher')}</Label>
            <Select
              value={selectedTeacherId}
              onValueChange={(value) => {
                setSelectedTeacherId(value);
                setSelectedClassId('');
              }}
            >
              <SelectTrigger id="assign-teacher">
                <SelectValue placeholder={t('Select target teacher')} />
              </SelectTrigger>
              <SelectContent>
                {teacherChoices.map((teacher) => (
                  <SelectItem key={teacher.id} value={String(teacher.id)}>
                    {teacher.id ? teacher.name : t('No teacher')} ({teacher.groups})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-group">{t('Group')}</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={selectedTeacherId === ''}>
              <SelectTrigger id="assign-group">
                <SelectValue placeholder={selectedTeacherId === '' ? t('Choose a teacher first') : t('Select a group')} />
              </SelectTrigger>
              <SelectContent>
                {teacherClasses.map((cls) => (
                  <SelectItem key={getClassId(cls)} value={String(getClassId(cls))}>
                    {cls.class_name || `#${getClassId(cls)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-start-date">{t('Start date')}</Label>
            <Input id="assign-start-date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <p className="text-xs text-muted-foreground">{t('The first month is charged from this day.')}</p>
          </div>
          {discounts.length > 0 && (
            <div className="space-y-2">
              <Label>{t('Copy discounts to the new group')}</Label>
              {discounts.map((discount) => (
                <label key={discount.discount_id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={copyDiscountIds.includes(discount.discount_id)}
                    onCheckedChange={(checked) =>
                      setCopyDiscountIds((current) => (checked ? [...current, discount.discount_id] : current.filter((id) => id !== discount.discount_id)))
                    }
                    aria-label={t('Copy the discount from {group}', { group: discount.group_name })}
                  />
                  <span>
                    <span className="font-semibold">{describeDiscount(discount, formatMoney)}</span> · {discount.group_name}
                    {discount.reason && <span className="block text-xs text-muted-foreground">{discount.reason}</span>}
                  </span>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">{t('A copied discount is priced on the new group fee and starts on the start date.')}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="assign-note">{t('Note')}</Label>
            <Textarea id="assign-note" value={note} maxLength={500} rows={2} onChange={(event) => setNote(event.target.value)} placeholder={t('e.g. parents asked for a second subject')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={assigning}>
              {t('Cancel')}
            </Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void assignToGroup()} disabled={!selectedClassId || !startDate || assigning}>
              {assigning && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t('Assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
