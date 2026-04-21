const gradeRepository = require('../repositories/grade.repository');
const { studentInCenter, classInCenter } = require('../../../shared/tenantDb');
const studentService = require('../../students/services/student.service');
const { calculateCoins } = require('../../../utils/coinCalculator');

const listGrades = (centerId?: number, teacherId?: number, studentId?: number) =>
  gradeRepository.findAll(centerId, teacherId, studentId);

const getGrade = (id: number, centerId?: number, teacherId?: number) => gradeRepository.findById(id, centerId, teacherId);

const createGrade = async (body: any, centerId?: number) => {
  const {
    student_id,
    teacher_id,
    subject,
    class_id,
    marks_obtained,
    total_marks,
    percentage,
    grade_letter,
    academic_year,
    term,
    session_id,
    attendance_score,
    homework_score,
    activity_score,
  } = body;
  if (centerId) {
    const [studentOk, classOk] = await Promise.all([
      studentInCenter(student_id, centerId),
      classInCenter(class_id, centerId),
    ]);
    if (!studentOk || !classOk) return { error: 'invalid_center' as const };
  }

  const totalMarks = total_marks || 100;
  const derivedTotal =
    (attendance_score ?? 0) +
    (homework_score ?? 0) +
    (activity_score ?? 0);
  const finalMarks = Number.isFinite(marks_obtained) ? marks_obtained : derivedTotal;
  const finalPercentage = Number.isFinite(percentage)
    ? percentage
    : totalMarks > 0
    ? (finalMarks * 100) / totalMarks
    : null;

  console.log('🔄 [Grade] Inserting grade...', { student_id, subject, marks_obtained, total_marks });
  
  const row = await gradeRepository.insert([
    student_id,
    teacher_id,
    subject,
    class_id,
    session_id ?? null,
    finalMarks,
    totalMarks,
    finalPercentage,
    grade_letter,
    academic_year,
    term,
    centerId ?? body.center_id,
    attendance_score ?? 0,
    homework_score ?? 0,
    activity_score ?? 0,
  ]);

  console.log('✅ [Grade] Grade inserted:', { gradeId: row?.grade_id, student_id: row?.student_id, marks_obtained: row?.marks_obtained, total_marks: row?.total_marks, percentage: row?.percentage });

  // Add coins to student if grade was created successfully
  if (row && !row.error) {
    console.log('💰 [Coins] Attempting to add coins...', { hasMarksObtained: row.marks_obtained !== null, hasTotalMarks: row.total_marks !== null });
    if (row.marks_obtained !== null && row.total_marks !== null) {
      try {
        const marksNum = Number(row.marks_obtained);
        const totalNum = Number(row.total_marks);
        const percentageNum = Number(row.percentage);
        const coinsToAdd = calculateCoins(marksNum, totalNum);
        console.log(`💰 [Coins] Calculated: ${coinsToAdd} coins for ${marksNum}/${totalNum} (${percentageNum?.toFixed(1)}%)`);
        
        if (coinsToAdd !== 0) {
          console.log(`💳 [Coins] Calling addCoins with:`, { studentId: row.student_id, delta: coinsToAdd, reason: `Grade awarded: ${percentageNum?.toFixed(1)}% in ${row.subject}` });
          const coinResult = await studentService.addCoins(
            row.student_id,
            coinsToAdd,
            `Grade awarded: ${percentageNum?.toFixed(1)}% in ${row.subject}`,
            null,
            'system'
          );
          console.log(`✅ [Coins] Added successfully:`, coinResult);
        } else {
          console.log(`⭕ [Coins] No coins to add (0 coins) for ${percentageNum?.toFixed(1)}%`);
        }
      } catch (coinError) {
        console.error('❌ [Coins] Error adding coins for grade:', coinError);
      }
    } else {
      console.log('⚠️ [Coins] Skipping: marks_obtained or total_marks is null');
    }
  } else {
    console.log('❌ [Grade] Grade insertion failed or had error:', row);
  }

  return row;
};

const updateGrade = (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { marks_obtained, percentage, grade_letter, attendance_score, homework_score, activity_score } = body;
  return gradeRepository.update(
    id,
    [marks_obtained, percentage, grade_letter, attendance_score, homework_score, activity_score],
    centerId,
    teacherId
  );
};

const listByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  gradeRepository.findByStudent(studentId, centerId, teacherId);

const listBySession = (sessionId: number, centerId?: number, teacherId?: number) =>
  gradeRepository.findBySession(sessionId, centerId, teacherId);

const deleteGrade = (id: number, centerId?: number, teacherId?: number) => gradeRepository.remove(id, centerId, teacherId);

const createBulk = async (grades: any[], centerId?: number) => {
  const results: any[] = [];
  for (const g of grades) {
    const row = await createGrade(g, centerId);
    // Note: Coins are added in createGrade function, no need to add here
    results.push(row);
  }
  return results;
};

const upsertSessionScores = async (body: any, centerId?: number) => {
  const {
    student_id,
    teacher_id,
    class_id,
    session_id,
    attendance_score,
    homework_score,
    activity_score,
    academic_year,
    term,
    total_marks,
    subject,
  } = body;
  if (!session_id) return null;
  
  console.log('🔄 [SessionScore] Upserting session scores...', { student_id, subject });
  
  const row = await gradeRepository.upsertSessionScores([
    student_id,
    teacher_id,
    subject || 'Session',
    class_id,
    session_id,
    total_marks || 100,
    academic_year,
    term,
    centerId ?? body.center_id,
    attendance_score ?? null,
    homework_score ?? null,
    activity_score ?? null,
  ]);

  console.log('✅ [SessionScore] Session scores upserted:', { gradeId: row?.grade_id, student_id: row?.student_id, marks_obtained: row?.marks_obtained, total_marks: row?.total_marks, percentage: row?.percentage });

  // Add coins to student if session scores were created/updated successfully
  if (row && !row.error) {
    console.log('💰 [Coins-Session] Attempting to add coins...', { hasMarksObtained: row.marks_obtained !== null, hasTotalMarks: row.total_marks !== null });
    if (row.marks_obtained !== null && row.total_marks !== null) {
      try {
        const marksNum = Number(row.marks_obtained);
        const totalNum = Number(row.total_marks);
        const percentageNum = Number(row.percentage);
        const coinsToAdd = calculateCoins(marksNum, totalNum);
        console.log(`💰 [Coins-Session] Calculated: ${coinsToAdd} coins for ${marksNum}/${totalNum} (${percentageNum?.toFixed(1)}%)`);
        
        if (coinsToAdd !== 0) {
          console.log(`💳 [Coins-Session] Calling addCoins with:`, { studentId: row.student_id, delta: coinsToAdd, reason: `Session grade awarded: ${percentageNum?.toFixed(1)}% in ${row.subject}` });
          const coinResult = await studentService.addCoins(
            row.student_id,
            coinsToAdd,
            `Session grade awarded: ${percentageNum?.toFixed(1)}% in ${row.subject}`,
            null,
            'system'
          );
          console.log(`✅ [Coins-Session] Added successfully:`, coinResult);
        } else {
          console.log(`⭕ [Coins-Session] No coins to add (0 coins) for ${percentageNum?.toFixed(1)}%`);
        }
      } catch (coinError) {
        console.error('❌ [Coins-Session] Error adding coins for session score:', coinError);
      }
    } else {
      console.log('⚠️ [Coins-Session] Skipping: marks_obtained or total_marks is null');
    }
  } else {
    console.log('❌ [SessionScore] Session score upsert failed or had error:', row);
  }

  return row;
};

module.exports = {
  listGrades,
  getGrade,
  createGrade,
  updateGrade,
  listByStudent,
  listBySession,
  deleteGrade,
  createBulk,
  upsertSessionScores,
};

export {};
