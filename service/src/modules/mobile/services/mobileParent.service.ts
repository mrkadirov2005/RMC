const parentService = require('../../parents/services/parent.service');
const learnerService = require('./mobileLearner.service');

// @MOB-026 The parent's children, one entry per child even when the child has a record per
// group (parent links are copied to every group record). `linked_ids` holds every record id of
// the child, so a link to any of their group records counts.
const listChildren = async (parentId: number) => {
  const rows = (await parentService.getMyStudents(parentId)) || [];
  const profiles = await Promise.all(rows.map((row: any) => learnerService.profile(Number(row.student_id), row.center_id ?? undefined)));
  const byChild = new Map<number, any>();
  profiles.forEach((child: any, index: number) => {
    if (!child) return;
    const entry = byChild.get(child.student_id) || { ...child, linked_ids: new Set<number>([child.student_id]) };
    entry.linked_ids.add(Number(rows[index].student_id));
    child.groups.forEach((group: any) => entry.linked_ids.add(Number(group.student_id)));
    byChild.set(child.student_id, entry);
  });
  return [...byChild.values()].map((child) => ({ ...child, linked_ids: [...child.linked_ids] }));
};

// @MOB-025 The child the parent asked for, or null when it is not one of theirs.
const findChild = async (parentId: number, studentId: number) => {
  const children = await listChildren(parentId);
  return children.find((child: any) => child.linked_ids.includes(Number(studentId))) || null;
};

module.exports = { listChildren, findChild };

export {};
