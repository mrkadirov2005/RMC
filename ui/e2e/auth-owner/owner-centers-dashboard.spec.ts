import { expect, test } from '@playwright/test';
import { clearBrowserSession, loginAs } from '../helpers/auth';

const unsupported = (reason: string) => test.fixme(true, reason);

test.describe('workflow catalog: owner accounts', () => {
  test.beforeEach(async ({ page }) => clearBrowserSession(page));

  test('WF-021 Open owner registration → valid registration', async () => unsupported('Registration mutates the singleton owner fixture and is not safely reset per selected flow.'));

  test('WF-022 Owner registration → required field validation', async () => unsupported('The registration form uses noValidate and has no required-field feedback beyond password matching.'));

  test('WF-023 Owner registration → duplicate username error', async () => unsupported('A disposable duplicate owner fixture is not available.'));

  test('WF-024 Owner → owner list shows accounts', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.getByRole('button', { name: 'Owners', exact: true }).click();
    await expect(page.getByRole('heading', { name: /owner panel/i })).toBeVisible();
    await expect(page.getByText('e2e_owner').first()).toBeVisible();
  });

  test('WF-025 Owner → search owner list', async () => unsupported('Owner Manager currently has no owner search control.'));
  test('WF-026 Owner → add owner account', async () => unsupported('No disposable owner-account fixture/reset contract exists.'));
  test('WF-027 Owner → edit owner account', async () => unsupported('Editing the seeded owner would affect independently selected flows.'));
  test('WF-028 Owner → deactivate owner account', async () => unsupported('Owner Manager exposes delete, not an account deactivation action.'));
  test('WF-029 Owner → cancel destructive action', async () => unsupported('No disposable secondary owner fixture exists for a safe delete-cancel flow.'));
  test('WF-030 Owner → switch active center', async () => unsupported('Center switching is exposed on Centers, not the Owner accounts page described by this flow.'));
});

test.describe('workflow catalog: centers', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'owner');
  });

  test('WF-031 Owner → Centers shows center list', async ({ page }) => {
    await page.goto('/#/centers');
    await expect(page.getByRole('heading', { name: /centers management/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search centers/i)).toBeVisible();
  });

  test('WF-032 Owner → add center with valid data', async () => unsupported('Creating centers needs per-flow database reset to remain independently runnable.'));

  test('WF-033 Owner → add center with missing data shows validation', async () => unsupported('The center dialog Save action bypasses native form validation and exposes no client-side required-field messages.'));

  test('WF-034 Owner → duplicate center shows error', async () => unsupported('No disposable known center payload is guaranteed for a duplicate mutation.'));

  test('WF-035 Owner → search centers shows matching center', async ({ page }) => {
    await page.goto('/#/centers');
    const search = page.getByPlaceholder(/search centers/i);
    await search.fill('E2E');
    await expect(page.getByText(/e2e/i).first()).toBeVisible();
  });

  test('WF-036 Owner → open center details', async () => unsupported('Centers are rendered as rows and have no center-details action or route.'));
  test('WF-037 Owner → edit center', async () => unsupported('Editing the seeded center would affect independently selected flows.'));
  test('WF-038 Owner → deactivate center', async () => unsupported('Centers exposes activate and delete, not deactivate.'));
  test('WF-039 Owner → delete disposable center', async () => unsupported('The seed does not provide a disposable center fixture.'));

  test('WF-040 Admin → Centers directly shows access denied', async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
    await page.goto('/#/centers');
    await expect(page).toHaveURL(/#\/unauthorized/);
  });
});

test.describe('workflow catalog: dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserSession(page);
    await loginAs(page, 'admin');
  });

  test('WF-211 Admin → Dashboard shows summary', async ({ page }) => {
    await expect(page.getByText(/statistics scope/i)).toBeVisible();
    await expect(page.getByText(/payment health/i)).toBeVisible();
    await expect(page.getByText(/operational pulse/i)).toBeVisible();
  });

  test('WF-212 Admin → Students summary opens details', async () => unsupported('The current dashboard has no Students summary card.'));
  test('WF-213 Admin → Teachers summary opens details', async () => unsupported('The current dashboard has no Teachers summary card.'));

  test('WF-214 Admin → Payments summary opens details', async ({ page }) => {
    await page.getByRole('button', { name: /amount still to collect/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  for (const [id, scope] of [['215', 'Teacher'], ['216', 'Class']] as const) {
    test(`WF-${id} Admin → change dashboard scope to ${scope.toLowerCase()}`, async ({ page }) => {
      await page.getByRole('button', { name: scope, exact: true }).click();
      await expect(page.getByText(new RegExp(`choose ${scope.toLowerCase()}`, 'i'))).toBeVisible();
    });
  }

  test('WF-217 Admin → dashboard previous month', async ({ page }) => {
    const label = page.getByLabel(/previous month/i).locator('..').getByText(/\w+ \d{4}/);
    const before = await label.textContent();
    await page.getByLabel(/previous month/i).click();
    await expect(label).not.toHaveText(before || '');
  });

  test('WF-218 Admin → dashboard next month', async ({ page }) => {
    const label = page.getByLabel(/next month/i).locator('..').getByText(/\w+ \d{4}/);
    const before = await label.textContent();
    await page.getByLabel(/next month/i).click();
    await expect(label).not.toHaveText(before || '');
  });

  test('WF-219 Admin → dashboard student detail opens profile', async () => unsupported('No current Students summary card exists to enter a student-details dialog.'));
  test('WF-220 Admin → dashboard teacher detail opens profile', async () => unsupported('No current Teachers summary card exists to enter a teacher-details dialog.'));
});
