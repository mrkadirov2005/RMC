import { expect, test } from '@playwright/test';
import { openAsAdmin, openSeededClass } from './helpers';

const unsupported = (title: string, reason: string) => test(title, async () => test.fixme(true, reason));

unsupported('WF-241 Admin imports a valid classes CSV', 'Import mutates shared data and needs a per-test cleanup fixture.');

test('WF-242 Admin imports an invalid classes CSV and sees an error', async ({ page }) => {
  await openAsAdmin(page, '/classes');
  await page.getByRole('button', { name: /more group actions/i }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /import csv|csv import/i }).click();
  const fileChooser = await chooser;
  await fileChooser.setFiles({ name: 'invalid-classes.csv', mimeType: 'text/csv', buffer: Buffer.from('wrong,columns\ninvalid,row') });
  await expect(page.getByText(/invalid|error|failed|required/i).first()).toBeVisible();
});

test('WF-243 Admin exports classes CSV as a download', async ({ page }) => {
  await openAsAdmin(page, '/classes');
  await page.getByRole('button', { name: /more group actions/i }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export csv|csv eksport/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/classes.*\.csv/i);
});

unsupported('WF-244 Admin bulk-deletes selected classes', 'Bulk deletion needs multiple disposable class fixtures and cleanup.');
unsupported('WF-245 Admin force-deletes a disposable class', 'The shared seed has no disposable class and force-delete is destructive.');
unsupported('WF-246 Admin generates class sessions', 'Session generation mutates a date range and needs a disposable scheduled class fixture.');

for (const item of [
  { id: 247, tab: 'Subjects', result: /no subjects assigned|subject/i },
  { id: 248, tab: 'Points', result: /points|student/i },
  { id: 249, tab: 'Tests', result: /no tests assigned|test/i },
  { id: 250, tab: 'Sessions', result: /session|date/i },
] as const) {
  test(`WF-${item.id} Admin opens class ${item.tab} tab`, async ({ page }) => {
    await openSeededClass(page);
    await page.getByRole('tab', { name: item.tab, exact: true }).click();
    await expect(page.getByRole('tab', { name: item.tab, exact: true })).toHaveAttribute('data-state', 'active');
    await expect(page.getByText(item.result).first()).toBeVisible();
  });
}

test('WF-261 User switches Calendar to Month view', async ({ page }) => {
  await openAsAdmin(page, '/calendar');
  await page.getByRole('tab', { name: 'Month' }).click();
  await expect(page.getByRole('tab', { name: 'Month' })).toHaveAttribute('data-state', 'active');
});

test('WF-262 User switches Calendar to Week view', async ({ page }) => {
  await openAsAdmin(page, '/calendar');
  await page.getByRole('tab', { name: 'Week' }).click();
  await expect(page.getByRole('tab', { name: 'Week' })).toHaveAttribute('data-state', 'active');
});

test('WF-263 User opens a calendar day and sees daily sessions', async ({ page }) => {
  await openAsAdmin(page, '/calendar');
  await page.getByRole('tab', { name: 'Month' }).click();
  const currentDay = page.locator('button').filter({ has: page.locator('div.h-7') }).first();
  await currentDay.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('WF-264 User closes calendar details and returns to the selected date', async ({ page }) => {
  await openAsAdmin(page, '/calendar');
  const currentDay = page.locator('button').filter({ has: page.locator('div.h-7') }).first();
  await currentDay.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/calendar/);
});

test('WF-265 Admin refreshes Archive and sees latest records', async ({ page }) => {
  await openAsAdmin(page, '/archive');
  await page.getByRole('button', { name: /refresh/i }).click();
  await expect(page.getByRole('tab', { name: 'Students' })).toBeVisible();
});

for (const item of [
  { id: 266, tab: 'Students', column: 'Enrollment' },
  { id: 267, tab: 'Teachers', column: 'Employee ID' },
  { id: 268, tab: 'Classes', column: 'Class' },
  { id: 269, tab: 'Payments', column: 'Amount' },
  { id: 270, tab: 'Calendar Sessions', column: 'Date' },
] as const) {
  test(`WF-${item.id} Admin opens archived ${item.tab} tab`, async ({ page }) => {
    await openAsAdmin(page, '/archive');
    await page.getByRole('tab', { name: item.tab, exact: true }).click();
    await expect(page.getByRole('tab', { name: item.tab, exact: true })).toHaveAttribute('data-state', 'active');
    await expect(page.getByRole('columnheader', { name: item.column }).first()).toBeVisible();
  });
}
