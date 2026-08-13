export const getTeacherDisplayName = (teacher: any) => {
  const value = teacher?.data ?? teacher;
  const nested = value?.teacher ?? value;
  return String(
    nested?.teacher_name
      || nested?.full_name
      || [nested?.first_name, nested?.last_name].filter(Boolean).join(' ')
      || nested?.username
      || '',
  ).trim();
};
