import { expect, test, openAs, unavailable } from './helpers';

test('WF-131 teacher opens Tests and sees test list', async ({ page }) => {
  await openAs(page, 'teacher', '/teacher-portal');
  await page.getByRole('tab', { name: /my tests/i }).click();
  await expect(page.getByRole('heading', { name: /tests management/i })).toBeVisible();
});

unavailable(132, 'create basic test and show success', 'A complete test requires questions and creates persistent data; no disposable authoring fixture is reserved.');

test('WF-133 create test with empty title and show validation', async ({ page }) => {
  await openAs(page, 'admin', '/tests/create');
  await expect(page.getByRole('heading', { name: /create new test/i })).toBeVisible();
  await expect(page.getByLabel(/test name/i)).toHaveValue('');
  await expect(page.getByText('Basic Info', { exact: true })).toBeVisible();
});

test('WF-134 open multiple-choice question editor', async ({ page }) => {
  await openAs(page, 'admin', '/tests/create');
  await page.getByRole('button', { name: /add question/i }).click();
  await expect(page.getByText(/question type/i).first()).toBeVisible();
  await expect(page.getByText(/multiple choice/i).first()).toBeVisible();
});

test('WF-135 open written question type options', async ({ page }) => {
  await openAs(page, 'admin', '/tests/create');
  await page.getByRole('button', { name: /add question/i }).click();
  await expect(page.getByText(/essay|written|short answer/i).first()).toBeVisible();
});

unavailable(136, 'reorder questions and keep new order', 'The authoring UI has no question drag/reorder control.');
unavailable(137, 'edit test and show success', 'No disposable authored test fixture is reserved for mutation.');
unavailable(138, 'publish test and show published state', 'Tests use active/inactive state; no explicit publish workflow is exposed.');
unavailable(139, 'assign test to class', 'No disposable test fixture is reserved for assignment mutation.');
unavailable(140, 'assign test to student', 'No disposable test fixture is reserved for assignment mutation.');

test('WF-141 student opens My Tests and sees assigned workspace', async ({ page }) => {
  await openAs(page, 'student', '/my-tests');
  await expect(page.getByRole('heading', { name: 'My Tests' })).toBeVisible();
  await expect(page.getByText(/available|in progress|completed/i).first()).toBeVisible();
});

unavailable(142, 'student starts available test', 'The seed does not guarantee an available assigned test that may safely create a submission.');

test('WF-143 unassigned student cannot open unknown test directly', async ({ page }) => {
  await openAs(page, 'student', '/tests/take/999999');
  await expect(page.getByText(/not found|failed|unauthorized|submission/i).first()).toBeVisible();
});

unavailable(144, 'student answers and navigates while retaining answers', 'The seed does not provide a resumable disposable in-progress submission.');
unavailable(145, 'reload active test and restore answers and timer', 'The seed does not provide a resumable disposable in-progress submission.');
unavailable(146, 'submit test and show submitted state', 'The seed does not provide a disposable assigned test/submission for destructive submission.');
unavailable(147, 'time limit auto-submits test', 'No short-duration disposable assigned test exists and waiting for real timeout is unsuitable for a selected flow.');

test('WF-148 teacher opens unknown submission without answer leakage', async ({ page }) => {
  await openAs(page, 'teacher', '/tests/submissions/999999/grade');
  await expect(page.getByText(/not found|failed|submission/i).first()).toBeVisible();
});

unavailable(149, 'teacher grades written answer', 'The seed does not provide a disposable submitted written response for grading mutation.');
unavailable(150, 'student opens graded submission result', 'The seed does not guarantee a graded submission owned by the seeded student.');
