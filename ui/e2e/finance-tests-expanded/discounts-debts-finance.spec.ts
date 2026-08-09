import { expect, test, openAs, unavailable } from './helpers';

unavailable(111, 'add fixed discount to student', 'No dedicated discount-management page or seeded disposable student discount fixture exists.');
unavailable(112, 'add percentage discount', 'The current UI exposes discount reporting, but no percentage-discount creation workflow.');
unavailable(113, 'consume monthly discount in payment', 'This requires a seeded unconsumed monthly discount and payment mutation fixture, which E2E seed does not provide.');

test('WF-114 open Debts and show debt list', async ({ page }) => {
  await openAs(page, 'admin', '/debts');
  await expect(page.getByRole('heading', { name: /debts management/i })).toBeVisible();
  await expect(page.getByText('Debt Records', { exact: true })).toBeVisible();
});

test('WF-115 search debts and show matching result state', async ({ page }) => {
  await openAs(page, 'admin', '/debts');
  const search = page.getByPlaceholder(/search debts by student/i);
  await search.fill('__no_such_debt__');
  await expect(page.getByText(/no debt records match your search/i)).toBeVisible();
});

unavailable(116, 'filter overdue debts', 'DebtsPage has search but no overdue-status filter control.');
unavailable(117, 'complete remaining payment and mark debt paid', 'No seeded disposable outstanding debt is reserved for this destructive reconciliation flow.');

test('WF-118 open Finance and show finance overview', async ({ page }) => {
  await openAs(page, 'admin', '/finance');
  await expect(page.getByRole('heading', { name: /finance management/i })).toBeVisible();
  await expect(page.getByPlaceholder(/search teachers by name or email/i)).toBeVisible();
});

unavailable(119, 'filter Finance by teacher and date', 'FinancePage supports teacher search only; it has no date filter or summary totals.');

test('WF-120 open teacher finance details', async ({ page }) => {
  await openAs(page, 'admin', '/finance');
  await page.getByPlaceholder(/search teachers/i).fill('E2E Teacher');
  await page.getByRole('button', { name: /view finance details/i }).first().click();
  await expect(page).toHaveURL(/#\/finance\/teacher\/\d+/);
  await expect(page.getByText(/finance|payment/i).first()).toBeVisible();
});
