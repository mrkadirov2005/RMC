import { describe, expect, it } from 'vitest';
import * as selectors from '../entitySelectors';

const state = (overrides: Record<string, unknown> = {}) =>
  ({
    students: { items: [], loading: false },
    teachers: { items: [], loading: false },
    classes: { items: [], loading: false },
    subjects: { items: [], loading: false },
    centers: { items: [], loading: false },
    payments: { items: [], loading: false },
    ...overrides,
  }) as never;

describe('option selectors', () => {
  it('labels a student with their name and enrollment number', () => {
    const options = selectors.selectStudentOptions(
      state({ students: { items: [{ student_id: 1, first_name: 'Ada', last_name: 'Lovelace', enrollment_number: 'ENR-1' }] } }),
    );

    expect(options).toEqual([{ id: 1, value: 1, label: 'Ada Lovelace (ENR-1)' }]);
  });

  it('omits the enrollment number when the student has none', () => {
    const options = selectors.selectStudentOptions(
      state({ students: { items: [{ student_id: 1, first_name: 'Ada', last_name: 'Lovelace' }] } }),
    );

    expect(options[0].label).toBe('Ada Lovelace');
  });

  it('falls back to the id when a student has no name', () => {
    const options = selectors.selectStudentOptions(state({ students: { items: [{ student_id: 4 }] } }));

    expect(options[0].label).toBe('Student 4');
  });

  it('accepts a bare id field in place of student_id', () => {
    const options = selectors.selectStudentOptions(state({ students: { items: [{ id: 7, first_name: 'Ada' }] } }));

    expect(options[0].id).toBe(7);
  });

  it.each([
    [{ student_id: 0 }],
    [{ student_id: -1 }],
    [{ student_id: 'abc' }],
    [{}],
  ])('drops a student row with an unusable id %p', (row) => {
    expect(selectors.selectStudentOptions(state({ students: { items: [row] } }))).toEqual([]);
  });

  it('labels a teacher with their full name', () => {
    const options = selectors.selectTeacherOptions(
      state({ teachers: { items: [{ teacher_id: 2, first_name: 'Grace', last_name: 'Hopper' }] } }),
    );

    expect(options[0].label).toBe('Grace Hopper');
  });

  it('falls back to the id when a teacher has no name', () => {
    const options = selectors.selectTeacherOptions(state({ teachers: { items: [{ teacher_id: 2 }] } }));

    expect(options[0].label).toBe('Teacher 2');
  });

  it('labels a subject by its name', () => {
    const options = selectors.selectSubjectOptions(
      state({ subjects: { items: [{ subject_id: 3, subject_name: 'Maths' }] } }),
    );

    expect(options[0].label).toBe('Maths');
  });

  it('falls back to the id when a subject has no name', () => {
    const options = selectors.selectSubjectOptions(state({ subjects: { items: [{ subject_id: 3 }] } }));

    expect(options[0].label).toBe('Subject 3');
  });

  it('labels a center by its name', () => {
    const options = selectors.selectCenterOptions(
      state({ centers: { items: [{ center_id: 4, center_name: 'North', city: 'Tashkent' }] } }),
    );

    expect(options[0].label).toBe('North');
  });

  it('falls back to the city when a center has no name', () => {
    const options = selectors.selectCenterOptions(
      state({ centers: { items: [{ center_id: 4, city: 'Tashkent' }] } }),
    );

    expect(options[0].label).toBe('Tashkent');
  });

  it('falls back to the id when a center has neither', () => {
    const options = selectors.selectCenterOptions(state({ centers: { items: [{ center_id: 4 }] } }));

    expect(options[0].label).toBe('Center 4');
  });

  it('labels a payment by its receipt number and amount', () => {
    const options = selectors.selectPaymentOptions(
      state({ payments: { items: [{ payment_id: 5, receipt_number: 'RCPT-1', amount: 200 }] } }),
    );

    expect(options[0].label).toBe('Receipt #RCPT-1 - 200');
  });

  it('labels a payment without a receipt by its id', () => {
    const options = selectors.selectPaymentOptions(
      state({ payments: { items: [{ payment_id: 5, amount: 200 }] } }),
    );

    expect(options[0].label).toBe('Payment 5 - 200');
  });

  it('treats a payment with no amount as zero', () => {
    const options = selectors.selectPaymentOptions(state({ payments: { items: [{ payment_id: 5 }] } }));

    expect(options[0].label).toBe('Payment 5 - 0');
  });

  it('labels a class through the shared group label helper', () => {
    const options = selectors.selectClassOptions(
      state({ classes: { items: [{ class_id: 6, class_name: 'A1', class_code: 'CLS-1' }] } }),
    );

    expect(options[0].id).toBe(6);
    expect(typeof options[0].label).toBe('string');
  });
});

describe('lookup maps', () => {
  it('keys students by their id', () => {
    const map = selectors.selectStudentsByIdMap(
      state({ students: { items: [{ student_id: 1, first_name: 'Ada' }, { id: 2, first_name: 'Grace' }] } }),
    );

    expect(Object.keys(map)).toEqual(['1', '2']);
    expect(map[1].first_name).toBe('Ada');
  });

  it('leaves rows with an unusable id out of the map', () => {
    const map = selectors.selectStudentsByIdMap(state({ students: { items: [{ student_id: 0 }] } }));

    expect(map).toEqual({});
  });

  it('keys teachers by their id', () => {
    const map = selectors.selectTeachersByIdMap(state({ teachers: { items: [{ teacher_id: 3 }] } }));

    expect(map[3]).toBeDefined();
  });

  it('keys classes by their id', () => {
    const map = selectors.selectClassesByIdMap(state({ classes: { items: [{ class_id: 4 }] } }));

    expect(map[4]).toBeDefined();
  });
});

describe('parameterised student lookups', () => {
  const students = {
    items: [
      { student_id: 1, teacher_id: 7, class_id: 10 },
      { student_id: 2, teacher_id: 8, class_id: 10 },
      { student_id: 3, teacher_id: 7, class_id: 11 },
      { student_id: 0, teacher_id: 7, class_id: 10 },
    ],
  };

  it('lists the students belonging to one teacher', () => {
    const select = selectors.makeSelectStudentIdsByTeacherId();

    expect(select(state({ students }), 7)).toEqual([1, 3]);
  });

  it('lists the students belonging to one class', () => {
    const select = selectors.makeSelectStudentIdsByClassId();

    expect(select(state({ students }), 10)).toEqual([1, 2]);
  });

  it('returns nothing when no student matches', () => {
    const select = selectors.makeSelectStudentIdsByTeacherId();

    expect(select(state({ students }), 99)).toEqual([]);
  });
});

describe('selectEntityOptionsLoading', () => {
  it('reports nothing loading when every collection is idle', () => {
    expect(selectors.selectEntityOptionsLoading(state())).toBe(false);
  });

  it.each(['students', 'teachers', 'classes', 'subjects', 'centers', 'payments'])(
    'reports loading while %s is in flight',
    (key) => {
      expect(selectors.selectEntityOptionsLoading(state({ [key]: { items: [], loading: true } }))).toBe(true);
    },
  );
});
