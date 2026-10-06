// Tab component for the crm feature.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Loader2, Plus, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { classAPI, studentAPI, teacherAPI } from '../api';
import {
  getAssignableClasses,
  getAssignableTeachers,
  getClassId,
  getTeacherClasses,
  type ClassOption,
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
    setDialogOpen(true);
    try {
      const [classResponse, teacherResponse] = await Promise.all([classAPI.getAll(), teacherAPI.getAll()]);
      setClasses(unwrapApiRows<ClassOption>(classResponse));
      setTeachers(unwrapApiRows<TeacherOption>(teacherResponse));
    } catch (err) {
      showToast.error(getErrorMessage(err) || t("Couldn't load groups"));
    }
  };

  const assignToGroup = async () => {
    if (!selectedClassId) return;
    setAssigning(true);
    try {
      await studentAPI.assignToGroup(studentId, Number(selectedClassId));
      showToast.success(t('Student added to the new group'));
      setDialogOpen(false);
      await loadGroups();
    } catch (err) {
      showToast.error(getErrorMessage(err) || t("Couldn't add the student to the group"));
    } finally {
      setAssigning(false);
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
                    </TableCell>
                    <TableCell>{teacherName || '-'}</TableCell>
                    <TableCell>{group.status ? t(group.status) : '-'}</TableCell>
                    <TableCell className="text-right">{Number(group.coins || 0)}</TableCell>
                    <TableCell className="text-right">
                      {isCurrent ? (
                        <span className="text-xs text-muted-foreground">{t('Open now')}</span>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpenStudent(group.student_id)}>
                          {t('Open')}
                        </Button>
                      )}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={assigning}>
              {t('Cancel')}
            </Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void assignToGroup()} disabled={!selectedClassId || assigning}>
              {assigning && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t('Assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
