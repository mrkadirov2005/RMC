# Project Features (Screen-by-Screen)

This document lists screens and major UI sections for each feature module under `CRM_frontend/src/features`.

## CRM Module (`CRM_frontend/src/features/crm`)
1. `dashboard/Dashboard.tsx` - Welcome header with user name and role badge; 4 overview cards: Quick Stats, Recent Activities, System Health, Notifications.
2. `students/StudentsPage.tsx` - Class folders grid (including Unassigned); Class students list table with search + gender/status filters; Add/Edit Student modal (full profile fields, login, center/teacher/class assignments).
3. `students/StudentDetailPage.tsx` - Student header + back; Student info section; Statistics cards; Tabs: Attendance, Payments, Assignments, Individual Tasks, Grades.
4. `teachers/TeachersPage.tsx` - Teacher cards grid with status badges; View details action; Add/Edit Teacher modal (profile, employment, center, login fields on create).
5. `teachers/TeacherDetailPage.tsx` - Teacher profile header; Tabs: Information (contact/professional cards), Classes & Students (accordion per class with students table), Assignments (teacher assignment section), Tests (links to tests). Add Grades modal (select class/subject/term, grade table).
6. `payments/PaymentsPage.tsx` - Folder tabs: By Students, By Classes, By Teachers; Folder cards with totals; Payments list view with search/filter (status/method) + total amount; Add/Edit Payment modal (method/type/status/date/receipt/ref/notes).
7. `grades/GradesPage.tsx` - Folder tabs: By Students, By Classes, By Teachers; Folder cards with counts and averages; Grades list view with search/filter (term/letter); Add/Edit Grade modal (auto percentage/letter from marks).
8. `attendance/AttendancePage.tsx` - Folder tabs: By Students, By Classes, By Teachers; Folder cards with present/total stats; Attendance list view with search/filter (status/date); Add/Edit Attendance modal.
9. `classes/ClassesPage.tsx` - Class cards grid with schedule, capacity, payment; Add/Edit Class modal (schedule days/time, center, teacher); Class detail modal with tabs: Class Info, Students, Attendance (mark today), Grades (bulk entry), Calendar.
10. `centers/CentersPage.tsx` - Centers CRUD table; Add/Edit Center modal.
11. `debts/DebtsPage.tsx` - Payment Analysis section (DebtAnalyzer) with unpaid-months analysis and debt generation; Debts table; Add/Edit Debt modal.
12. `assignments/AssignmentsPage.tsx` - Tabs: By Classes and Personal Tasks; Folder cards with counts and completion; Assignment list view with search/filter (status); Add/Edit Assignment dialog.
13. `subjects/SubjectsPage.tsx` - Subjects table; Add/Edit Subject modal.
14. `tests/TestsPage.tsx` - Tests dashboard with stats cards; Filters (tab: all/active/inactive, type filter, search); Tests cards grid; Delete confirmation dialog.
15. `tests/CreateTestPage.tsx` - Multi-step wizard: Basic Info, Add Questions (with reading passages for reading tests), Settings, Review; supports question types, options, correct answers, word limits; create action.
16. `tests/TestDetailPage.tsx` - Test overview header + actions; Overview cards; Tabs: Overview, Questions, Submissions, Statistics; Start Test dialog.
17. `tests/StudentTestsPage.tsx` - Student test list with stats; Tabs: Available, In Progress, Completed; Test cards with start/continue/view actions.
18. `tests/TestAssignPage.tsx` - Assignment settings (type, due date, mandatory); Selection UI for all/class/individual; Save assignment.
19. `tests/TakeTestPage.tsx` - Test-taking UI: timer, progress bar, question navigator, answer inputs by type, flagging, submit confirmation and time-up dialogs.
20. `tests/GradeSubmissionPage.tsx` - Grade submission UI: per-question grading, quick grade buttons, manual marks, feedback; save grades.
21. `tests/ViewSubmissionPage.tsx` - Submission summary, answers summary table, detailed answer review, grade action (if ungraded).

## Teacher Module (`CRM_frontend/src/features/teacher`)
1. `TeacherPortal.tsx` - Teacher header, stats cards, tabs: Students, Tests, Classes, Attendance, Grades, Assignments; Quick action FAB.
2. `components/TeacherStudentsTab.tsx` - Searchable students table; Student details dialog with quick stats and tabs (Overview, Grades, Attendance, Test Results).
3. `components/TeacherTestsTab.tsx` - Tests grid with filters (all/active/inactive/with submissions), search, context menu; Submissions dialog; Delete confirmation.
4. `components/TeacherClassesTab.tsx` - Class cards with status and schedule.
5. `components/TeacherAttendanceTab.tsx` - Select class/date; attendance stats; attendance table with status buttons and notes; save confirmation dialog.
6. `components/TeacherGradesTab.tsx` - Filters (class/subject/search), stats cards, tabs (Student Grades, Recent Activity); Add Grade dialog.
7. `components/TeacherAssignmentsTab.tsx` - Filters (class/search), stats cards, tabs (Active/Past/All); Assignment cards; Create/Edit dialog; Delete confirmation; inline menu.

## Student Module (`CRM_frontend/src/features/student`)
1. `StudentPortal.tsx` - Student header, stats cards; Tabs: Overview (recent activity + pending tests), My Tests (pending/completed tables), My Grades, Attendance.

## Attendance Module (`CRM_frontend/src/features/attendance`)
1. No screens found in this folder.
