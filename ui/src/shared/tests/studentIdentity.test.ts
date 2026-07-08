import { describe, expect, it, vi } from 'vitest';
import { createStudentIdentity } from '../studentIdentity';

describe('createStudentIdentity', () => {
  it('creates matching enrollment number and email from stable random pieces', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    vi.spyOn(Math, 'random').mockReturnValue(0.42);

    const identity = createStudentIdentity();

    expect(identity.enrollment_number).toBe('1234567890420000');
    expect(identity.email).toBe('temurbekschool1234567890420000@gmail.com');
  });
});
