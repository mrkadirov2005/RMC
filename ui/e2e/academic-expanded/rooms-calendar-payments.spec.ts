import { expect, test } from '@playwright/test';
import { openAsAdmin } from './helpers';

const unsupported = (title: string, reason: string) => test(title, async () => test.fixme(true, reason));

test('WF-091 Admin opens Rooms and sees room management', async ({ page }) => {
  await openAsAdmin(page, '/rooms');
  await expect(page.getByTestId('rooms-workspace')).toBeVisible();
  await expect(page.getByTestId('rooms-header').getByRole('heading', { name: 'Rooms', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Availability for selected time')).toBeVisible();

  await page.getByTestId('rooms-tab-availability').click();
  await expect(page.getByRole('table', { name: 'Room availability' })).toBeVisible();
  await page.getByTestId('rooms-tab-teacher').click();
  await expect(page.getByRole('tabpanel')).toContainText(/teacher/i);
  await page.getByTestId('rooms-tab-subject').click();
  await expect(page.getByRole('tabpanel')).toContainText(/subject/i);
  await page.getByTestId('rooms-tab-reports').click();
  await expect(page.getByText('Room utilization')).toBeVisible();
});

test('WF-092 Admin opens the add-room form and fills valid room data', async ({ page }) => {
  await openAsAdmin(page, '/rooms');
  await page.getByTestId('create-room-button').click();
  const roomNumber = page.getByLabel('Room number *');
  await roomNumber.fill('E2E Preview Room');
  await expect(roomNumber).toHaveValue('E2E Preview Room');
});

unsupported('WF-093 Admin adds a room with invalid capacity', 'Room assignments have no capacity field in the current UI.');
unsupported('WF-094 Admin adds a duplicate room and sees an error', 'Rooms are schedule assignments and repeated room numbers are valid when their times do not conflict.');
unsupported('WF-095 Admin creates room slots', 'There is no separate slot-creation workflow; slots are represented by room assignments.');
test('WF-096 Admin opens slot management from an available room', async ({ page }) => {
  await openAsAdmin(page, '/rooms');
  await page.getByTestId('rooms-tab-availability').click();
  const entry = page.getByTestId(/^manage-room-/).first();
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page.getByRole('heading', { name: /room slots management/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
});
unsupported('WF-097 Admin books an occupied slot and sees conflict', 'Needs disposable overlapping room assignments to test the backend conflict safely.');
unsupported('WF-098 Admin cancels a booking', 'The current UI has no booking entity or cancel-booking action.');

test('WF-099 User changes Calendar from month to week and sees week dates', async ({ page }) => {
  await openAsAdmin(page, '/calendar');
  await page.getByTestId('calendar-view-day').click();
  await expect(page.getByTestId('calendar-view-day')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('calendar-view-week').click();
  await expect(page.getByRole('grid', { name: 'Weekly lesson calendar' })).toBeVisible();
  await page.getByTestId('calendar-view-month').click();
  await expect(page.getByRole('grid', { name: 'Monthly lesson calendar' })).toBeVisible();
  await page.getByTestId('calendar-view-agenda').click();
  await expect(page.getByRole('table', { name: 'Calendar agenda' })).toBeVisible();
  await page.getByTestId('calendar-today').click();
  await expect(page.getByTestId('calendar-date-picker')).toHaveValue(new Date().toISOString().slice(0, 10));
});

test('WF-100 User filters and opens a calendar event to see lesson details', async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  await page.route('**/api/calendar/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/events')) return route.fulfill({ json: [{ event_id: 'e2e-event', source: 'session', status: 'ready', date: today, start_time: '09:00', end_time: '10:00', class_id: 1, class_name: 'E2E Calendar Group', teacher_name: 'E2E Teacher', subject_name: 'English', room_name: 'Room 101', attendance: { present: 1, absent: 0, unmarked: 1 } }] });
    if (path.endsWith('/summary')) return route.fulfill({ json: { total: 1, planned: 0, ready: 1, in_progress: 0, conducted: 0, attendance_missing: 1 } });
    return route.fulfill({ json: [] });
  });
  await openAsAdmin(page, '/calendar');
  await page.getByTestId('calendar-filter-search').fill('E2E Calendar');
  await page.getByTestId('calendar-view-agenda').click();
  await page.getByRole('row', { name: /E2E Calendar Group/ }).click();
  const drawer = page.getByTestId('calendar-event-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('E2E Calendar Group');
  await expect(drawer).toContainText('1 present · 0 absent · 1 unmarked');
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

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
