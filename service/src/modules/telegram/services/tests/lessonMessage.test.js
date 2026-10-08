const { buildLessonMessage } = require('../lessonMessage');
const { computeStandings } = require('../standings');

const base = {
  studentName: 'Ali Valiyev',
  className: 'English A',
  lessonDate: '2026-10-08',
  attendanceStatus: 'Present',
  attendanceScore: 40,
  homework: { label: 'Good', score: 15 },
  activity: { label: 'Very active', score: 30 },
  total: 85,
  grade: '4',
  coinsDelta: 8,
  coinsBalance: 120,
};

describe('lesson result message', () => {
  it('shows the score, why, coins and standing in Uzbek', () => {
    const text = buildLessonMessage({ ...base, groupPlace: 2, groupSize: 12, centerPlace: 3 });
    expect(text).toContain('<b>English A</b> · 08.10.2026');
    expect(text).toContain('Ball: 85/100</b> (baho: 4)');
    expect(text).toContain('Davomat: Vaqtida keldi — 40');
    expect(text).toContain('Uy vazifasi: Yaxshi — 15');
    expect(text).toContain('Darsdagi faollik: Juda faol — 30');
    expect(text).toContain('Coin: +8 (jami: 120)');
    expect(text).toContain("guruhda <b>2-o'rin</b>");
    expect(text).toContain("Markaz bo'yicha <b>3-o'rin</b>");
  });

  it('warns the bottom five, stays quiet in the middle, and encourages outside the center top five', () => {
    const bottom = buildLessonMessage({ ...base, groupPlace: 11, groupSize: 12, inGroupBottomFive: true, centerPlace: 40 });
    expect(bottom).toContain('eng past 5 talikdasiz');
    expect(bottom).toContain('hali kirmagansiz');

    const middle = buildLessonMessage({ ...base, groupPlace: 6, groupSize: 12, inGroupBottomFive: false, centerPlace: 9 });
    expect(middle).not.toContain("guruhda <b>");
    expect(middle).not.toContain('eng past');
  });

  it('escapes names and shows the absence reason', () => {
    const text = buildLessonMessage({ ...base, studentName: '<b>x</b>', attendanceStatus: 'Absent', attendanceScore: 0, reason: 'Kasal' });
    expect(text).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(text).toContain('Davomat: Kelmadi — 0');
    expect(text).toContain('Izoh: Kasal');
  });
});

describe('monthly standings', () => {
  const row = (classId, id, attendance) => ({ class_id: classId, main_student_id: id, attendance_score: attendance, homework_score: 20, activity_score: 20 });
  const rows = [
    ...Array.from({ length: 12 }, (_, i) => row(1, i + 1, 40 - i)),
    row(2, 99, 40), row(2, 99, 40), // another group, scores twice: top of the center
  ];

  it('places a student in the group and the center, and flags the bottom five', () => {
    expect(computeStandings(rows, 1, 1)).toEqual({ groupPlace: 1, groupSize: 12, inGroupBottomFive: false, centerPlace: 2 });
    expect(computeStandings(rows, 1, 12)).toMatchObject({ groupPlace: 12, inGroupBottomFive: true });
    expect(computeStandings(rows, 1, 6)).toMatchObject({ groupPlace: 6, inGroupBottomFive: false });
  });

  it('never puts a top-five student in a small group into the bottom five', () => {
    const small = rows.filter((item) => item.class_id === 1).slice(0, 4);
    expect(computeStandings(small, 1, 4)).toMatchObject({ groupPlace: 4, inGroupBottomFive: false });
  });
});
