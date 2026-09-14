import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The assign and grading screens used to read a `crm_auth` key that this app has
// never written. The lookup silently produced 0 for the assigning user, which the
// assign endpoint rejected outright, and an empty grader, which was quietly filed
// against every marked paper. Who performed an action now comes from the
// authenticated session on the server, so neither screen should reach for storage
// or send an actor field at all.

const featureDir = join(__dirname, '..');
const read = (relative: string) => readFileSync(join(featureDir, relative), 'utf8');

const ACTOR_FIELDS = ['assigned_by', 'graded_by', 'graded_by_type'];
const SCREENS = ['TestAssignPage.tsx', 'GradeSubmissionPage.tsx'];

describe('who performed an action', () => {
  it.each(SCREENS)('%s reads no auth key out of browser storage', (file) => {
    const source = read(file);

    expect(source).not.toContain('crm_auth');
    expect(source).not.toContain('localStorage');
  });

  it.each(SCREENS)('%s sends no actor field of its own', (file) => {
    const source = read(file);

    for (const field of ACTOR_FIELDS) {
      expect(source).not.toContain(`${field}:`);
    }
  });

  it('the assign client takes only the test and its assignments', () => {
    const source = readFileSync(join(featureDir, '..', '..', '..', 'shared', 'api', 'api.ts'), 'utf8');
    const start = source.indexOf('assignTest:');
    const signature = source.slice(start, start + 200);

    expect(signature).toContain('assignTest: (testId: number, assignments: any[])');
    expect(signature).not.toContain('assigned_by');
  });
});
