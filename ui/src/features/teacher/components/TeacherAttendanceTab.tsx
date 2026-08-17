// Tab component for the teacher feature.

import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart } from '@/shared/components/PieChart';
// group details rendered inline (no dialog)
// Cards grid used for group student details (no table)

import { classAPI, studentAPI, attendanceAPI } from '../api';
import { useAppSelector } from '../../crm/hooks';
import { useMonthlyClassPoints } from '../../crm/classes/hooks/useMonthlyClassPoints';
import { getMonthKey, shiftMonth } from '../../crm/classes/utils/date';
import TeacherStudentDirectory from './TeacherStudentDirectory';
import { useLanguage } from '../../../i18n/LanguageContext';

interface ClassInfo {
  class_id: number;
  class_name: string;
  student_count?: number;
  section?: string;
}

 


interface TeacherAttendanceTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

// Renders the teacher attendance tab tab.
const TeacherAttendanceTab = ({ teacherId, onRefresh }: TeacherAttendanceTabProps) => {
  const { t } = useLanguage();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsData, setGroupsData] = useState<Array<{ id: number; label: string; value: number; color?: string }>>([]);
  const [selectedGroup, setSelectedGroup] = useState<{ id: number; label: string } | null>(null);
  const [groupStudents, setGroupStudents] = useState<Array<{ student_id: number; first_name?: string; last_name?: string; attendancePercent?: number; attendedCount?: number; totalCount?: number }>>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, any>>(new Map());
  const [selectedClassSessions, setSelectedClassSessions] = useState<any[]>([]);
  const [selectedClassSchedule, setSelectedClassSchedule] = useState<{ days: string[]; time: string }>({ days: [], time: '' });
  const [selectedClassStudents, setSelectedClassStudents] = useState<any[]>([]);

// Runs side effects for this component.
  useEffect(() => {
    loadClasses();
  }, [teacherId]);

  const { user } = useAppSelector((state: any) => state.auth);

  const todayKey = new Date().toISOString().split('T')[0];
  const {
    pointsMonth,
    setPointsMonth,
    monthlyLessonDays,
    monthlyPointsBySessionStudent,
    monthlyPointStats,
  } = useMonthlyClassPoints({
    authUser: user,
    centerId: undefined,
    schedule: selectedClassSchedule,
    sessions: selectedClassSessions,
    students: selectedClassStudents,
    todayKey,
  });

  const monthlyLessonDates = useMemo(
    () => (monthlyLessonDays || []).map((d: any) => d.dateKey).filter(Boolean),
    [monthlyLessonDays]
  );
  const monthlyLessonDaysCount = monthlyLessonDates.length;
  const monthlySessionsByDate = useMemo(() => {
    const map = new Map<string, any>();
    (monthlyLessonDays || []).forEach((d: any) => {
      if (d.session) map.set(d.dateKey, d.session);
    });
    return map;
  }, [monthlyLessonDays]);

// Runs side effects for this component.
  useEffect(() => {
    // after classes load, compute group attendance summaries
    if (classes.length > 0) {
      void loadAttendanceSummaries();
    }
  }, [classes]);

// Loads classes.
  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAll(
        teacherId ? { teacher_id: Number(teacherId), page: 1, limit: 100 } : { page: 1, limit: 100 }
      );
      const payload = response.data || [];
      setClasses(Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

// Loads class students.
  // Load students for a class and compute their attendance percent
  const loadStudentsForGroup = async (classId: number, date?: string, month?: string) => {
    try {
      setGroupsLoading(true);
      const fetchLimit = 100;
      const response = await studentAPI.getAll({ class_id: Number(classId), page: 1, limit: fetchLimit });
      const payload = response.data || [];
      const classStudents = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];

      // fetch attendance for class
      const attRes = await attendanceAPI.getByClass(classId).catch(() => ({ data: [] }));
      let records = attRes.data || [];
      if (month) {
        const monthKey = month;
        records = (records || []).filter((r: any) => String(r.attendance_date || '').startsWith(monthKey));
      } else if (date) {
        records = (records || []).filter((r: any) => String(r.attendance_date || '').startsWith(date));
      }

      const studentMap = new Map<number, { student_id: number; first_name?: string; last_name?: string; attendancePercent?: number }>();
      classStudents.forEach((s: any) => studentMap.set(Number(s.student_id || s.id), { student_id: Number(s.student_id || s.id), first_name: s.first_name, last_name: s.last_name, attendancePercent: 0 }));

      const byStudent = new Map<number, { present: number; total: number }>();
      (records || []).forEach((r: any) => {
        const sid = Number(r.student_id || r.studentId || 0);
        if (!byStudent.has(sid)) byStudent.set(sid, { present: 0, total: 0 });
        const cur = byStudent.get(sid)!;
        const status = String(r.status || '').toLowerCase();
        if (['present', 'on_time', 'attended', 'paid'].includes(status)) cur.present += 1;
        cur.total += 1;
      });

      const studentsWithPercent: typeof groupStudents = Array.from(studentMap.values()).map((s) => {
        const stats = byStudent.get(s.student_id) || { present: 0, total: 0 };
        const percent = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
        return { ...s, attendancePercent: percent, attendedCount: stats.present, totalCount: stats.total };
      });

      setGroupStudents(studentsWithPercent);

      // build attendance map keyed by `${date}:${studentId}` (fallback for days without a session-based grade)
      const map = new Map<string, any>();
      (records || []).forEach((r: any) => {
        const d = String(r.attendance_date || '').slice(0, 10);
        const sid = Number(r.student_id || r.studentId || 0);
        if (d && sid) map.set(`${d}:${sid}`, r);
      });
      setAttendanceMap(map);

      // fetch sessions/schedule/students for the class so useMonthlyClassPoints can compute the points grid
      try {
        const sessionsResp = await classAPI.getSessions(classId).catch(() => ({ data: [] }));
        const sessions = sessionsResp?.data || [];
        setSelectedClassSessions(Array.isArray(sessions) ? sessions : []);

        const cls = classes.find((c: any) => Number(c.class_id || c.id || 0) === Number(classId));
        const parseSection = (section?: string) => {
          if (!section) return { days: [], time: '' };
          try {
            const parsed = JSON.parse(section);
            return { days: Array.isArray(parsed?.days) ? parsed.days.map((d: any) => String(d)) : [], time: String(parsed?.time ?? '') };
          } catch {
            return { days: [], time: '' };
          }
        };
        setSelectedClassSchedule(parseSection(cls?.section));
        setSelectedClassStudents(classStudents || []);
      } catch (err) {
        console.error('Failed to load sessions/students for class:', err);
        setSelectedClassSessions([]);
        setSelectedClassStudents([]);
        setSelectedClassSchedule({ days: [], time: '' });
      }
    } catch (err) {
      console.error('Failed to load group students:', err);
      setGroupStudents([]);
    } finally {
      setGroupsLoading(false);
    }
  };

// Loads existing attendance.
  const loadAttendanceSummaries = async () => {
    try {
      setGroupsLoading(true);
      const items = classes;
      if (!Array.isArray(items) || items.length === 0) {
        setGroupsData([]);
        return;
      }

      const results = await Promise.all(items.map(async (cls: any, index: number) => {
        const id = Number(cls.class_id || cls.id || 0);
        const studentsResp = await studentAPI.getAll({ class_id: id, page: 1, limit: 1 }).catch(() => ({ data: [] }));
        const attResp = await attendanceAPI.getByClass(id).catch(() => ({ data: [] }));
        const studentsCount = Array.isArray(studentsResp.data) ? studentsResp.data.length : (Array.isArray(studentsResp) ? studentsResp.length : 0);
        const records = attResp.data || [];
        const present = (records || []).filter((r: any) => ['present', 'on_time', 'attended', 'paid'].includes(String(r.status || '').toLowerCase())).length;
        const total = (records || []).length || Math.max(studentsCount, 1);
        const percent = total > 0 ? Math.round((present / total) * 100) : 0;
        return { id, label: cls.class_name || `Group ${index + 1}`, value: percent, color: undefined };
      }));

      const filtered = results.filter((r) => Number.isFinite(r.value));
      setGroupsData(filtered);
      // notify parent if it requested a refresh callback
      if (typeof onRefresh === 'function') {
        try { onRefresh(); } catch {}
      }
    } catch (err) {
      console.error('Failed to load attendance summaries:', err);
      setGroupsData([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const [rotating, setRotating] = useState(true);

  const [groupDate, setGroupDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const openGroup = async (group: { id: number; label: string }) => {
    setSelectedGroup(group);
    await loadStudentsForGroup(group.id, undefined, pointsMonth);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const palette = ['#6366F1', '#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];
  const pieData = groupsData.map((g, idx) => ({ label: g.label, value: g.value, color: g.color || palette[idx % palette.length] }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">{t('Attendance Overview')}</h3>
        <div>
          <Button size="sm" onClick={() => setRotating((r) => !r)}>
            {rotating ? t('Pause Rotation') : t('Start Rotation')}
          </Button>
        </div>
      </div>

      {!selectedGroup && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
          <CardContent className="flex items-center justify-center py-6">
            {groupsLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            ) : pieData.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('No groups to display')}</div>
            ) : (
              <div style={{ width: 300, height: 300, position: 'relative' }}>
                <div
                    style={{
                    position: 'absolute',
                    left: 20,
                    top: 20,
                    width: 260,
                    height: 260,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transformOrigin: '50% 50%',
                    animation: rotating ? 'spin 8s linear infinite' : undefined,
                  }}
                >
                  <div style={{ position: 'relative', width: 260, height: 260 }}>
                    <PieChart data={pieData} size={260} strokeWidth={42} />

                    {/* Labels inside rotating container so they rotate with the wheel */}
                    {(() => {
                      const size = 260;
                      const stroke = 42;
                      const radius = Math.max(size / 2 - stroke / 2, 0);
                      const total = pieData.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
                      let offset = 0;
                      return pieData.map((slice, idx) => {
                        const half = (slice.value / total) * Math.PI * 2 / 2;
                        const angle = offset / total * Math.PI * 2 - Math.PI / 2 + half;
                        offset += slice.value;
                        const cx = size / 2; // center x inside rotating container
                        const cy = size / 2; // center y
                        const labelRadius = radius + 24;
                        const x = cx + Math.cos(angle) * labelRadius;
                        const y = cy + Math.sin(angle) * labelRadius;
                        const left = x - 40; // approximate label width/2
                        const top = y - 12;
                        return (
                          <button
                            key={slice.label}
                            onClick={() => void openGroup(groupsData[idx])}
                            style={{
                              position: 'absolute',
                              left,
                              top,
                              width: 80,
                              textAlign: 'center',
                              padding: '2px 4px',
                              fontSize: 12,
                              borderRadius: 6,
                              background: 'rgba(255,255,255,0.9)',
                              border: '1px solid rgba(0,0,0,0.06)',
                              cursor: 'pointer',
                            }}
                          >
                            {slice.label}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="space-y-2">
            {groupsData.map((g, idx) => (
              <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div style={{ width: 12, height: 12, background: g.color || palette[idx % palette.length], borderRadius: 3 }} />
                  <div>
                    <div className="font-medium text-sm">{g.label}</div>
                    <div className="text-xs text-muted-foreground">{g.value}%</div>
                  </div>
                </div>
                <div>
                  <Button size="sm" onClick={() => void openGroup(g)}>{t('View')}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {selectedGroup && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">{selectedGroup.label} — {t('Attendance')}</div>
            <div>
              <Button size="sm" onClick={() => setSelectedGroup(null)}>{t('Back')}</Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <div className="flex items-center justify-between rounded-md border bg-white px-2.5 py-2 shadow-sm">
                    <p className="text-[11px] font-semibold text-muted-foreground">{t('Lesson days')}</p>
                    <p className="text-base font-black text-slate-950">{monthlyLessonDaysCount}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-white px-2.5 py-2 shadow-sm">
                    <p className="text-[11px] font-semibold text-muted-foreground">{t('Filled')}</p>
                    <p className="text-base font-black text-emerald-700">{monthlyPointStats.filled}/{monthlyPointStats.cells}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-white px-2.5 py-2 shadow-sm">
                    <p className="text-[11px] font-semibold text-muted-foreground">{t('Missing')}</p>
                    <p className="text-base font-black text-rose-700">{monthlyPointStats.missing}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-md border bg-white px-2.5 py-2 shadow-sm">
                    <p className="text-[11px] font-semibold text-muted-foreground">{t('Average')}</p>
                    <p className="text-base font-black text-violet-700">{monthlyPointStats.average}</p>
                  </div>
                </div>
              </div>

              <div className="mt-2 sm:mt-0 sm:ml-4 flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => { setPointsMonth((m) => shiftMonth(m || getMonthKey(), -1)); if (selectedGroup) void loadStudentsForGroup(selectedGroup.id, undefined, shiftMonth(pointsMonth, -1)); }}>
                  ◀
                </Button>
                <Input
                  type="month"
                  value={pointsMonth}
                  onChange={async (e) => { const val = e.target.value; setPointsMonth(val); if (selectedGroup) await loadStudentsForGroup(selectedGroup.id, undefined, val); }}
                  className="h-9 w-[160px]"
                />
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => { setPointsMonth((m) => shiftMonth(m || getMonthKey(), 1)); if (selectedGroup) void loadStudentsForGroup(selectedGroup.id, undefined, shiftMonth(pointsMonth, 1)); }}>
                  ▶
                </Button>
              </div>
            </div>

            {groupsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div>
                {/* Top stats row: three small cards + date picker */}
                <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <div className="flex items-center justify-between rounded-md border bg-white px-3 py-3 shadow-sm">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">{t('Attendance Rate')}</p>
                        <p className="text-base font-black text-slate-950">{
                          (() => {
                            const total = groupStudents.reduce((s, x) => s + (x.totalCount || 0), 0);
                            const attended = groupStudents.reduce((s, x) => s + (x.attendedCount || 0), 0);
                            return total > 0 ? `${Math.round((attended / total) * 100)}%` : '-';
                          })()
                        }</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-white px-3 py-3 shadow-sm">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">{t('Attended')}</p>
                        <p className="text-base font-black text-emerald-700">{groupStudents.reduce((s, x) => s + (x.attendedCount || 0), 0)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-white px-3 py-3 shadow-sm">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground">{t('Unattended')}</p>
                        <p className="text-base font-black text-rose-700">{Math.max(0, groupStudents.reduce((s, x) => s + (x.totalCount || 0) - (x.attendedCount || 0), 0))}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 sm:mt-0 sm:ml-4">
                    <Label className="text-xs text-muted-foreground">{t('Date')}</Label>
                    <Input type="date" value={groupDate} onChange={async (e) => { const val = e.target.value; setGroupDate(val); if (selectedGroup) await loadStudentsForGroup(selectedGroup.id, val); }} className="w-40" />
                  </div>
                </div>

                {/* Global student list component */}
                <TeacherStudentDirectory
                  students={groupStudents.map((s) => ({
                    student_id: s.student_id,
                    first_name: s.first_name || '',
                    last_name: s.last_name || '',
                    enrollment_number: '',
                    status: 'active',
                  }))}
                  title={selectedGroup ? `${selectedGroup.label} — ${t('Students')}` : t('Students')}
                  loading={groupsLoading}
                  emptyMessage={t('No students found')}
                  monthlyLessonDates={monthlyLessonDates}
                  attendanceMap={attendanceMap}
                  monthlyPointsBySessionStudent={monthlyPointsBySessionStudent}
                  monthlySessionsByDate={monthlySessionsByDate}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendanceTab;
