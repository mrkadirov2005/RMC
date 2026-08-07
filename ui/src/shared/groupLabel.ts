type GroupLike = {
  id?: number | string;
  class_id?: number | string;
  class_name?: string | null;
  section?: string | null;
  room_assignments?: Array<{ day?: string | null }> | null;
};

const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const getGroupWeekdays = (group: GroupLike) => {
  let sectionDays: string[] = [];
  try {
    const parsed = JSON.parse(String(group.section || ''));
    sectionDays = Array.isArray(parsed?.days) ? parsed.days.map(String) : [];
  } catch {
    sectionDays = [];
  }
  const assignmentDays = Array.isArray(group.room_assignments)
    ? group.room_assignments.map((assignment) => String(assignment.day || '').trim())
    : [];
  const unique = Array.from(new Set([...sectionDays, ...assignmentDays].map((day) => day.trim()).filter(Boolean)));
  return unique.sort((a, b) => {
    const aIndex = weekdayOrder.findIndex((day) => day.toLowerCase() === a.toLowerCase());
    const bIndex = weekdayOrder.findIndex((day) => day.toLowerCase() === b.toLowerCase());
    return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
  });
};

export const formatGroupLabel = (group: GroupLike) => {
  const id = group.class_id || group.id;
  const name = String(group.class_name || '').trim() || (id ? `Group #${id}` : 'Group');
  const days = getGroupWeekdays(group);
  return days.length > 0 ? `${name} · ${days.join(', ')}` : name;
};
