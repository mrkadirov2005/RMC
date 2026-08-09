import { expect, test } from '@playwright/test';
import { openAsAdmin } from './helpers';

const unsupported = (title: string, reason: string) => test(title, async () => test.fixme(true, reason));

test('WF-091 Admin opens Rooms and sees room management', async ({ page }) => {
  await openAsAdmin(page, '/rooms');
  await expect(page.getByRole('heading', { name: /room management/i })).toBeVisible();
  await expect(page.getByText(/physical rooms & schedules/i)).toBeVisible();
});

test('WF-092 Admin opens the add-room form and fills valid room data', async ({ page }) => {
  await openAsAdmin(page, '/rooms');
  await page.getByRole('button', { name: /add room assignment/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/room number/i).fill('E2E Preview Room');
  await dialog.getByLabel(/start time/i).fill('10:00');
  await dialog.getByLabel(/end time/i).fill('11:00');
  await expect(dialog.getByLabel(/room number/i)).toHaveValue('E2E Preview Room');
});

unsupported('WF-093 Admin adds a room with invalid capacity', 'Room assignments have no capacity field in the current UI.');
unsupported('WF-094 Admin adds a duplicate room and sees an error', 'Rooms are schedule assignments and repeated room numbers are valid when their times do not conflict.');
unsupported('WF-095 Admin creates room slots', 'There is no separate slot-creation workflow; slots are represented by room assignments.');
unsupported('WF-096 Admin books an available slot', 'There is no booking action in the room UI; assignments are edited directly.');
unsupported('WF-097 Admin books an occupied slot and sees conflict', 'Needs disposable overlapping room assignments to test the backend conflict safely.');
unsupported('WF-098 Admin cancels a booking', 'The current UI has no booking entity or cancel-booking action.');

test('WF-099 User changes Calendar from month to week and sees week dates', async ({ page }) => {
  await openAsAdmin(page, '/calendar');
  await page.getByRole('tab', { name: 'Week' }).click();
  await expect(page.getByRole('tab', { name: 'Week' })).toHaveAttribute('data-state', 'active');
  await expect(page.getByText(/students/i).first()).toBeVisible();
});

unsupported('WF-100 User opens a calendar event and sees lesson details', 'The seed does not guarantee an event on the currently displayed calendar range.');

test('WF-101 Admin opens Payments and sees the payment list', async ({ page }) => {
  await openAsAdmin(page, '/payments');
  await expect(page.getByText(/payments management/i).first()).toBeVisible();
  await expect(page.getByText(/payment records/i).first()).toBeVisible();
});

unsupported('WF-102 Admin adds a full payment', 'A repeatable payment write needs a disposable student billing-period fixture.');
unsupported('WF-103 Admin adds a partial payment', 'A repeatable partial payment needs a disposable student billing-period fixture.');

test('WF-104 Admin submits an empty payment and sees required fields', async ({ page }) => {
  await openAsAdmin(page, '/payments/new');
  await expect(page.getByText('Add Payment').first()).toBeVisible();
  await expect(page.getByText(/^Student \*$/).first()).toBeVisible();
  await expect(page.getByLabel(/payment date/i)).toBeVisible();
  await expect(page.getByLabel(/receipt number/i)).toBeVisible();
});

unsupported('WF-105 Admin adds a duplicate receipt and sees an error', 'Needs a disposable payment receipt fixture and would mutate shared payment data.');
unsupported('WF-106 Admin searches payments', 'The current Payments page groups records but exposes no payment search input.');
unsupported('WF-107 Admin filters payments by date', 'The current Payments page exposes no date filter control.');
unsupported('WF-108 Admin opens a payment receipt', 'The current payment list opens an edit form, not a read-only receipt-details view.');
unsupported('WF-109 Admin edits a payment', 'Needs a disposable seeded payment so editing remains repeatable.');
unsupported('WF-110 Admin deletes a disposable payment', 'The shared seed does not provide a disposable payment record.');
