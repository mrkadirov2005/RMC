import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart } from '@/shared/components/LineChart';

type Props = { classes: any[]; students: any[] };

export const ClassReportsPanel = ({ classes, students }: Props) => {
  const rows = useMemo(() => {
    const counts = new Map<number, number>();
    students.forEach((student) => {
      if (String(student.status || '').toLowerCase() !== 'active') return;
      const classId = Number(student.class_id || 0);
      if (classId) counts.set(classId, (counts.get(classId) || 0) + 1);
    });
    return classes
      .filter((item) => !item.deleted_at)
      .map((item) => {
        const id = Number(item.class_id || item.id || 0);
        const enrolled = counts.get(id) || 0;
        const capacity = Number(item.capacity || 0);
        return {
          id,
          name: String(item.class_name || item.name || `Class #${id}`),
          status: String(item.status || (item.deleted_at ? 'inactive' : 'active')),
          enrolled,
          capacity,
          percentage: capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0,
          exceeded: capacity > 0 && enrolled > capacity,
        };
      })
      .sort((a, b) => b.enrolled - a.enrolled || a.name.localeCompare(b.name));
  }, [classes, students]);

  const totals = useMemo(() => ({
    classes: rows.length,
    students: rows.reduce((sum, row) => sum + row.enrolled, 0),
    capacity: rows.reduce((sum, row) => sum + row.capacity, 0),
    exceeded: rows.filter((row) => row.exceeded).length,
  }), [rows]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ['Classes', totals.classes, CheckCircle2],
          ['Students', totals.students, Users],
          ['Capacity', totals.capacity || '—', Users],
          ['Over capacity', totals.exceeded, AlertTriangle],
        ] as Array<[string, string | number, typeof CheckCircle2]>).map(([label, value, Icon]) => (
          <Card key={String(label)}>
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
              <Icon className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Class filling</CardTitle></CardHeader>
        <CardContent><LineChart data={rows.map((row) => ({ label: row.name, value: row.percentage }))} height={240} color="#0ea5e9" /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Classes list</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b text-muted-foreground"><tr><th className="px-2 py-2">Class</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Students</th><th className="px-2 py-2">Limit</th><th className="px-2 py-2">Filling</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0">
              <td className="px-2 py-3 font-semibold">{row.name}</td>
              <td className="px-2 py-3 capitalize">{row.status}</td>
              <td className={`px-2 py-3 font-semibold ${row.exceeded ? 'text-red-600' : ''}`}>{row.enrolled}</td>
              <td className="px-2 py-3">{row.capacity || '—'}</td>
              <td className={`px-2 py-3 font-semibold ${row.exceeded ? 'text-red-600' : row.capacity > 0 && row.enrolled === row.capacity ? 'text-amber-600' : 'text-emerald-600'}`}>
                {row.capacity > 0 ? `${row.percentage}%` : 'No limit'}
              </td>
            </tr>)}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
