const archiveRepository = require('../repositories/archive.repository');

const listArchive = async (centerId?: number) => {
  const [students, teachers, classes, payments, sessions] = await Promise.all([
    archiveRepository.findArchivedStudents(centerId),
    archiveRepository.findArchivedTeachers(centerId),
    archiveRepository.findArchivedClasses(centerId),
    archiveRepository.findArchivedPayments(centerId),
    archiveRepository.findArchivedSessions(centerId),
  ]);

  return {
    students,
    teachers,
    classes,
    payments,
    sessions,
    counts: {
      students: students.length,
      teachers: teachers.length,
      classes: classes.length,
      payments: payments.length,
      sessions: sessions.length,
    },
  };
};

module.exports = { listArchive };

export {};
