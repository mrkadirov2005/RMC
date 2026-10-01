import { assignmentsLabels } from './assignments';
import { attendanceLabels } from './attendance';
import { authLabels } from './auth';
import { calendarLabels } from './calendar';
import { centersLabels } from './centers';
import { classesLabels } from './classes';
import { componentsLabels } from './components';
import { compositeLabels } from './composite';
import { consolidationsLabels } from './consolidations';
import { dashboardLabels } from './dashboard';
import { debtsLabels } from './debts';
import { financeLabels } from './finance';
import { gradesLabels } from './grades';
import { ownerLabels } from './owner';
import { paymentsLabels } from './payments';
import { publicLabels } from './public';
import { roomsLabels } from './rooms';
import { salaryLabels } from './salary';
import { settingsLabels } from './settings';
import { studentLabels } from './student';
import { studentsLabels } from './students';
import { teacherLabels } from './teacher';
import { teachersLabels } from './teachers';

export const pageLabelTranslations: Record<string, string> = {
  ...assignmentsLabels,
  ...attendanceLabels,
  ...authLabels,
  ...calendarLabels,
  ...centersLabels,
  ...classesLabels,
  ...componentsLabels,
  ...compositeLabels,
  ...consolidationsLabels,
  ...dashboardLabels,
  ...debtsLabels,
  ...financeLabels,
  ...gradesLabels,
  ...ownerLabels,
  ...paymentsLabels,
  ...publicLabels,
  ...roomsLabels,
  ...salaryLabels,
  ...settingsLabels,
  ...studentLabels,
  ...studentsLabels,
  ...teacherLabels,
  ...teachersLabels,
};
