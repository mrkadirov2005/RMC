// Read-only 2-column overview cards used on the owner student detail page and
// on the teacher portal student popup. Owner keeps its own inline edit branch.

import { buildStudentOverviewRows, splitStudentOverviewRows } from '../studentOverview';
import { getListRowBackground } from '../../settings/listAppearance';

type StudentLike = Parameters<typeof buildStudentOverviewRows>[0]['student'];

interface StudentOverviewCardsProps {
  student: StudentLike;
  groupName?: string;
  teacherName?: string;
  coinBalance?: number;
}

export const StudentOverviewCards = ({
  student,
  groupName,
  teacherName,
  coinBalance = 0,
}: StudentOverviewCardsProps) => {
  const rows = buildStudentOverviewRows({ student, groupName, teacherName, coinBalance });
  const columns = splitStudentOverviewRows(rows);
  const sections = [
    { title: 'Main information', rows: columns.main },
    { title: 'Contact & additional information', rows: columns.additional },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      {sections.map((section) => (
        <section key={section.title} className="overflow-hidden rounded-md border border-slate-200 dark:border-border">
          <div className="border-b bg-slate-50 px-3 py-2 dark:border-border dark:bg-muted/40">
            <h2 className="text-sm font-bold text-slate-950 dark:text-card-foreground">{section.title}</h2>
          </div>
          <dl data-alternating-list="true" className="divide-y divide-slate-200 text-sm dark:divide-border">
            {section.rows.map((item, index) => (
              <div
                key={item.label}
                data-list-row="true"
                className="grid min-h-9 grid-cols-[125px_minmax(0,1fr)] items-center gap-3 px-3 py-2 sm:grid-cols-[170px_minmax(0,1fr)]"
                style={{ backgroundColor: getListRowBackground(index) }}
              >
                <dt className="font-medium text-muted-foreground">{item.label}</dt>
                <dd className="min-w-0 break-words font-semibold text-slate-950 dark:text-card-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
};
