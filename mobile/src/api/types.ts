// @MOB-102 Response shapes of /api/mobile/v1, mirroring service/src/modules/mobile.

export type Role = 'student' | 'parent';

export type User = {
  role: Role;
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  center_id?: number | null;
  class_id?: number | null;
  class_name?: string | null;
  is_frozen?: boolean;
  phone?: string | null;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  session_id: number;
  user: User;
};

export type Paged<T> = { items: T[]; page: number; page_size: number; total: number };

export type Group = {
  student_id: number;
  class_id: number | null;
  class_name: string | null;
  teacher_name: string | null;
  status: string | null;
  is_main: boolean;
};

export type Child = {
  student_id: number;
  first_name: string | null;
  last_name: string | null;
  center_id: number | null;
  status: string | null;
  is_frozen: boolean;
  groups: Group[];
};

export type AttendanceRow = { attendance_id: number; attendance_date: string; status: string; class_id?: number | null };
export type AttendanceSummary = { total: number; present: number; absent: number; excused: number; rate: number };

export type ScheduleSlot = {
  class_id: number;
  class_name: string | null;
  teacher_name: string | null;
  day: string;
  start_time: string;
  end_time: string | null;
  room: string | null;
};

export type GradeRow = {
  grade_id: number;
  date: string | null;
  class_name: string | null;
  teacher_name: string | null;
  subject: string | null;
  marks_obtained: number | null;
  total_marks: number | null;
  percentage: number | null;
  grade_letter: string | null;
  coins: number | null;
};

export type MonthlyAverage = { class_name: string | null; month: string; average: number; lessons: number };

export type CoinTransaction = { transaction_id: number; delta: number; reason: string | null; source_type: string | null; created_at: string | null };

export type PaymentRow = { payment_id: number; date: string | null; amount: number; currency: string; method: string | null; status: string | null; receipt_number: string | null };
export type OpenDebt = { debt_id: number; amount: number; debt_date: string | null; due_date: string | null; remarks: string | null };

export type Dashboard = {
  student: Child;
  attendance: AttendanceSummary;
  recent_attendance: AttendanceRow[];
  recent_grades: GradeRow[];
  coins: { balance: number; recent: CoinTransaction[] };
  schedule: ScheduleSlot[];
  payments: { outstanding: number; next_due_date: string | null };
};

export type AttendanceResponse = Paged<AttendanceRow> & { summary: AttendanceSummary };
export type GradesResponse = Paged<GradeRow> & { monthly: MonthlyAverage[] };
export type CoinsResponse = Paged<CoinTransaction> & { balance: number };
export type PaymentsResponse = Paged<PaymentRow> & { outstanding: number; next_due_date: string | null; open_debts: OpenDebt[] };
export type LeaderboardEntry = { rank: number; name: string; coins: number; is_me: boolean };
export type Leaderboard = { scope: 'class' | 'center'; me: LeaderboardEntry | null; items: LeaderboardEntry[] };
export type AppNotification = {
  notification_id: number;
  category: string;
  title: string;
  body: string;
  data: { url?: string } | null;
  created_at: string;
  read_at: string | null;
};
export type NotificationPreference = { category: string; enabled: boolean };

export type OfficialLink = { link_id: number; title: string; url: string; icon: string | null };
export type Announcement = { announcement_id: number; title: string; body: string; audience: string; published_at: string };
export type Policy = {
  policy_id: number;
  title: string;
  version: number;
  body: string;
  requires_acceptance: boolean;
  published_at: string;
  accepted: boolean;
};
export type HomeworkStatus = 'new' | 'in_progress' | 'overdue' | 'submitted' | 'reviewed';
export type HomeworkItem = {
  assignment_id: number;
  title: string;
  skill: string;
  class_name: string | null;
  due_at: string | null;
  max_score: number | null;
  score: number | null;
  status: HomeworkStatus;
};
export type HomeworkQuestion =
  | { id: string; type: 'choice'; prompt: string; points: number; options: string[] }
  | { id: string; type: 'gap'; prompt: string; points: number }
  | { id: string; type: 'match'; prompt: string; points: number; left: string[]; options: string[] }
  | { id: string; type: 'text'; prompt: string; points: number; min_words: number | null };
export type HomeworkAnswers = Record<string, number | string | string[]>;
export type HomeworkDetail = {
  assignment_id: number;
  title: string;
  skill: string;
  instructions: string | null;
  class_name: string | null;
  due_at: string | null;
  max_score: number | null;
  status: HomeworkStatus;
  task: { questions: HomeworkQuestion[] };
  answers: HomeworkAnswers;
  score: number | null;
  feedback: string | null;
  per_question: Record<string, number | null> | null;
};

export type HelpKind = 'help' | 'complaint' | 'thanks' | 'suggestion';
export type HelpRequest = {
  request_id: number;
  kind: HelpKind;
  message: string;
  status: 'submitted' | 'in_review' | 'resolved';
  response: string | null;
  created_at: string;
};

export type Device = {
  session_id: number;
  device_name: string | null;
  platform: string | null;
  app_version: string | null;
  last_used_at: string | null;
  is_current: boolean;
};

// @MOB-127 Monthly series for the home charts.
export type Progress = {
  months: string[];
  attendance: { month: string; rate: number | null; lessons: number }[];
  scores: { group: string; points: { month: string; average: number | null }[] }[];
  coins: { month: string; balance: number; earned: number }[];
};
