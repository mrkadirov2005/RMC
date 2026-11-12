export {};

// Who counts as a student in totals ("1267 students"): every record not deleted, except the row a
// transferred-out student keeps in their old group (status 'Transferred'), which the new group's
// record already counts. The Students page, Finance and the owner panel all use this rule, so
// the same number shows everywhere.
const countedStudentSql = (alias = 's') =>
  `${alias}.deleted_at IS NULL AND (${alias}.status IS NULL OR ${alias}.status <> 'Transferred')`;

module.exports = { countedStudentSql };
