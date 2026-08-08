export const actors = {
  owner: { username: 'e2e_owner', password: 'E2ePass123!', route: '/login/owner', landing: '/owner/manage' },
  admin: { username: 'e2e_admin', password: 'E2ePass123!', route: '/login/superuser', landing: '/dashboard' },
  limitedAdmin: { username: 'e2e_limited', password: 'E2ePass123!', route: '/login/superuser', landing: '/dashboard' },
  teacher: { username: 'e2e_teacher', password: 'E2ePass123!', route: '/login/teacher', landing: '/teacher-portal' },
  student: { username: 'e2e_student', password: 'E2ePass123!', route: '/login/student', landing: '/student-portal' },
  frozenStudent: { username: 'e2e_frozen', password: 'E2ePass123!', route: '/login/student', landing: '/student-portal' },
} as const;

export type ActorName = keyof typeof actors;
