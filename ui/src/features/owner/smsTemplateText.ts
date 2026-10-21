// What a template will look like as an SMS: placeholders filled with sample values, the same plain
// Latin clean-up the server does, and how many SMS it takes.

export const PLACEHOLDER_LABELS: Record<string, string> = {
  ism: 'Student name',
  guruh: 'Group',
  markaz: 'Center name',
  oy: 'Period, e.g. "oktyabr oyi"',
  tolangan: 'Amount paid',
  qoldiq: 'Amount still owed',
  kutilgan: 'Amount due',
  soni: 'Lessons missed',
  sanalar: 'Dates missed',
};

const SAMPLE_VALUES: Record<string, string> = {
  ism: 'Ali Valiyev',
  guruh: 'IELTS B-12',
  markaz: 'Temurbek',
  oy: 'oktyabr oyi',
  tolangan: "300 000 so'm",
  qoldiq: "200 000 so'm",
  kutilgan: "500 000 so'm",
  soni: '2',
  sanalar: '07.10, 09.10',
};

/** Same as the server: ʻ ʼ and curly quotes become plain ones so a message stays 160 characters per SMS. */
const plainText = (value: string) =>
  value
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/[^\S\n]+/g, ' ')
    .trim();

export const previewTemplate = (body: string) =>
  plainText(body.replace(/\{([a-z_]+)\}/g, (_match, key: string) => SAMPLE_VALUES[key] ?? ''));

/** Characters and SMS parts: 160 per SMS in plain Latin (153 each when split), 70 (67) otherwise. */
export const smsLength = (text: string) => {
  const latin = /^[\x20-\x7E\n\r]*$/.test(text);
  const [single, part] = latin ? [160, 153] : [70, 67];
  return { characters: text.length, parts: text.length === 0 ? 0 : text.length <= single ? 1 : Math.ceil(text.length / part), latin };
};

/** Puts a placeholder where the cursor is, returning the new text and where the cursor goes. */
export const insertAt = (text: string, insertion: string, start: number, end: number) => ({
  text: `${text.slice(0, start)}${insertion}${text.slice(end)}`,
  cursor: start + insertion.length,
});

export const TEMPLATE_KIND_LABELS: Record<string, string> = {
  payment_success: 'Payment received',
  payment_waiting: 'Payment waiting',
  attendance: 'Missed lessons',
};

/** The two main sections: attendance warnings, and payments (a reminder or a receipt). */
export const TEMPLATE_GROUPS = [
  { id: 'attendance', title: 'Attendance warning', kinds: ['attendance'] },
  { id: 'payment', title: 'Payment', kinds: ['payment_waiting', 'payment_success'] },
] as const;

export const groupOfKind = (kind: string) => TEMPLATE_GROUPS.find((group) => (group.kinds as readonly string[]).includes(kind));
