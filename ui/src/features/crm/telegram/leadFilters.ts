// Leads by subject and level: the tabs above "New group" and "Waiting for a group" show how many
// people are gathered for each subject, and the level filter narrows a subject to one level.
// Old leads typed the subject by hand, so names are matched without case or extra spaces.

export type LeadLike = { subject?: string | null; level?: string | null };

export const ALL = '__all__';
export const NO_SUBJECT = '__none__';

const clean = (value?: string | null) => String(value || '').trim().replace(/\s+/g, ' ');
export const subjectKeyOf = (lead: LeadLike) => clean(lead.subject).toLowerCase() || NO_SUBJECT;
const levelKeyOf = (lead: LeadLike) => clean(lead.level).toLowerCase();

export type SubjectTab = { key: string; label: string; count: number };

/** One tab per subject with its count, largest first; "No subject" last. */
export const subjectTabs = (rows: LeadLike[]): SubjectTab[] => {
  const tabs = new Map<string, SubjectTab>();
  rows.forEach((lead) => {
    const key = subjectKeyOf(lead);
    const tab = tabs.get(key) || { key, label: key === NO_SUBJECT ? '' : clean(lead.subject), count: 0 };
    tab.count += 1;
    tabs.set(key, tab);
  });
  return Array.from(tabs.values()).sort((a, b) =>
    (a.key === NO_SUBJECT ? 1 : 0) - (b.key === NO_SUBJECT ? 1 : 0) || b.count - a.count || a.label.localeCompare(b.label));
};

/** The levels among the leads of one subject, with counts, in A-Z order. */
export const levelOptions = (rows: LeadLike[], subjectKey: string) => {
  const levels = new Map<string, { key: string; label: string; count: number }>();
  rows
    .filter((lead) => subjectKey === ALL || subjectKeyOf(lead) === subjectKey)
    .forEach((lead) => {
      const key = levelKeyOf(lead);
      if (!key) return;
      const option = levels.get(key) || { key, label: clean(lead.level), count: 0 };
      option.count += 1;
      levels.set(key, option);
    });
  return Array.from(levels.values()).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
};

export const filterLeads = <T extends LeadLike>(rows: T[], subjectKey: string, levelKey: string): T[] =>
  rows.filter((lead) =>
    (subjectKey === ALL || subjectKeyOf(lead) === subjectKey) && (levelKey === ALL || levelKeyOf(lead) === levelKey));
