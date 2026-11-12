jest.mock('../../../../db/pool', () => ({ db: {}, query: jest.fn() }));

const { schoolSearchRegex } = require('../student.repository');

// PostgreSQL's ~* is case-insensitive; JavaScript's 'i' flag behaves the same for these patterns.
const matches = (search, value) => new RegExp(schoolSearchRegex(search), 'i').test(value);

describe('student search by school', () => {
  test('"7-Maktab" finds school 7 only, not 97 or 37', () => {
    expect(matches('7-Maktab', '7-Maktab')).toBe(true);
    expect(matches('7-maktab', '7-MAKTAB')).toBe(true);
    expect(matches('7-Maktab', '97-Maktab')).toBe(false);
    expect(matches('7-Maktab', '37-Maktab')).toBe(false);
  });

  test('a class number matches the class, not a longer number', () => {
    expect(matches('7', '7-sinf')).toBe(true);
    expect(matches('7', '17-sinf')).toBe(false);
  });

  test('special characters in the search are taken literally', () => {
    expect(matches('a.b', 'axb')).toBe(false);
    expect(matches('a.b', 'a.b')).toBe(true);
  });
});
