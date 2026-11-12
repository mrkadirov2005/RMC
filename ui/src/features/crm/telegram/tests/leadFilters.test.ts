import { describe, expect, it } from 'vitest';
import { ALL, NO_SUBJECT, filterLeads, levelOptions, subjectTabs } from '../leadFilters';

const rows = [
  { name: 'a', subject: 'English', level: 'A1' },
  { name: 'b', subject: ' english ', level: 'A2' },
  { name: 'c', subject: 'English', level: 'a1' },
  { name: 'd', subject: 'Matematika', level: '' },
  { name: 'e', subject: '', level: 'A1' },
];

describe('lead filters', () => {
  it('counts each subject, ignoring case and spaces, with "no subject" last', () => {
    expect(subjectTabs(rows).map((tab) => [tab.key, tab.count])).toEqual([
      ['english', 3],
      ['matematika', 1],
      [NO_SUBJECT, 1],
    ]);
  });

  it('lists the levels of one subject with counts', () => {
    expect(levelOptions(rows, 'english').map((option) => [option.label, option.count])).toEqual([['A1', 2], ['A2', 1]]);
    expect(levelOptions(rows, 'matematika')).toEqual([]);
  });

  it('shows only the chosen subject and level', () => {
    expect(filterLeads(rows, 'english', ALL).map((lead) => lead.name)).toEqual(['a', 'b', 'c']);
    expect(filterLeads(rows, 'english', 'a1').map((lead) => lead.name)).toEqual(['a', 'c']);
    expect(filterLeads(rows, NO_SUBJECT, ALL).map((lead) => lead.name)).toEqual(['e']);
    expect(filterLeads(rows, ALL, ALL)).toHaveLength(5);
  });
});
