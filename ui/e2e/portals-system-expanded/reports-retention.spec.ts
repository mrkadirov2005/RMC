import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

test.describe('Reports and retention expanded workflows', () => {
  test.beforeEach(async ({ page }) => { await clearBrowserSession(page); });

  for (const [id, section, evidence] of [
    ['171', 'finance', /finance|revenue|payments/i],
    ['172', 'finance', /finance|revenue|payments/i],
    ['173', 'students', /student/i],
    ['174', 'teachers', /teacher/i],
    ['175', 'discounts', /discount/i],
    ['176', 'retention', /retention/i],
    ['177', 'attendance', /attendance/i],
  ] as const) {
    test(`WF-${id} owner opens ${section} report`, async ({ page }) => {
      await loginAs(page, 'owner');
      await page.goto(`/#/owner/reports?section=${section}`);
      await expect(page).toHaveURL(new RegExp(`section=${section}`));
      await expect(page.getByText(evidence).first()).toBeVisible();
    });
  }

  test('WF-178 owner changes report date range', async () => {
    test.fixme(true, 'Owner Reports has no report-wide date-range control.');
  });
  test('WF-179 owner switches center in Reports', async () => {
    test.fixme(true, 'Owner Reports aggregates across centers and has no report-local center switcher.');
  });

  test('WF-180 admin opens Intake and applies the available view filter', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/#/retention?view=intake');
    await expect(page).toHaveURL(/view=intake/);
    await expect(page.getByText(/intake|retention/i).first()).toBeVisible();
  });
});
