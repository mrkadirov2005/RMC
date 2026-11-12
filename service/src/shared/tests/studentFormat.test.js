const { formatSchoolName, formatSchoolClass, formatUzPhone, standardizeStudentPayload } = require('../studentFormat');

describe('student school, class and phone in one standard form', () => {
  test('a school number becomes "N-Maktab", however it was typed', () => {
    for (const typed of ['7', '7 maktab', '7-MAKTAB', '7-maktab', 'maktab 7', '№7 maktab', '7-son maktab', ' 7  maktab ']) {
      expect(formatSchoolName(typed, 'school')).toBe('7-Maktab');
    }
    expect(formatSchoolName('97', undefined)).toBe('97-Maktab');
  });

  test('anything that is not a plain school number is kept as typed', () => {
    expect(formatSchoolName('Prezident maktabi', 'school')).toBe('Prezident maktabi');
    expect(formatSchoolName('7', 'college')).toBe('7');
    expect(formatSchoolName('', 'school')).toBe('');
  });

  test('a class becomes "N-Sinf"; a college or university course "N-kurs"', () => {
    for (const typed of ['7', '7 sinf', '7-SINF', '7sinf']) expect(formatSchoolClass(typed, 'school')).toBe('7-Sinf');
    expect(formatSchoolClass('2', 'university')).toBe('2-kurs');
    expect(formatSchoolClass('7-A', 'school')).toBe('7-A');
  });

  test('an Uzbek phone becomes +998 and nine digits; anything else is kept', () => {
    for (const typed of ['901234567', '+998 90 123 45 67', '998901234567', '(90) 123-45-67']) {
      expect(formatUzPhone(typed)).toBe('+998901234567');
    }
    expect(formatUzPhone('12345')).toBe('12345');
    // A field left at the "+998" the form starts with is empty.
    expect(formatUzPhone('+998')).toBe('');
    expect(formatUzPhone('+998 ')).toBe('');
    expect(formatUzPhone('+7 916 123 45 67')).toBe('+7 916 123 45 67');
  });

  test('a payload keeps fields it did not send', () => {
    expect(standardizeStudentPayload({ first_name: 'Ali', school_name: '7', school_class: '5' }))
      .toEqual({ first_name: 'Ali', school_name: '7-Maktab', school_class: '5-Sinf' });
    expect(standardizeStudentPayload({ status: 'Active' })).toEqual({ status: 'Active' });
  });
});
