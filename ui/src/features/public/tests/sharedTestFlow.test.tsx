import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({
  api: {
    getTest: vi.fn(),
    start: vi.fn(),
    getSubmission: vi.fn(),
    submit: vi.fn(),
  },
}));

vi.mock('../api/sharedTestApi', () => ({ sharedTestAPI: api }));
vi.mock('@/utils/toast', () => ({
  handleApiError: (error: any) => error?.response?.data?.error ?? '',
  showToast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/features/crm/tests/TakeTestPage', () => ({
  default: () => <div>take test screen</div>,
}));

import { SharedTestPage } from '../SharedTestPage';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/share/tests/token-abc']}>
      <Routes>
        <Route path="/share/tests/:shareToken" element={<SharedTestPage />} />
      </Routes>
    </MemoryRouter>
  );

const testView = {
  test_name: 'Unit 4 Reading',
  test_type: 'multiple_choice',
  description: 'Covers units 3 and 4',
  instructions: 'Answer every question',
  total_marks: 20,
  passing_marks: 12,
  duration_minutes: 30,
  is_timed: true,
};

const refusal = (message: string) => ({ response: { data: { error: message } } });

describe('taking a test from a share link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getTest.mockResolvedValue(testView);
  });

  it('says only that the link is dead when the token does not resolve', async () => {
    api.getTest.mockRejectedValue(new Error('gone'));

    renderPage();

    expect(await screen.findByText('This link is no longer active')).toBeInTheDocument();
  });

  it('shows the cover details and asks for a username', async () => {
    renderPage();

    expect(await screen.findByText('Unit 4 Reading')).toBeInTheDocument();
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('20 marks')).toBeInTheDocument();
    expect(screen.getByLabelText('Your username')).toBeInTheDocument();
  });

  it('never renders a list of students to pick from', async () => {
    renderPage();

    await screen.findByText('Unit 4 Reading');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('refuses to start without a username', async () => {
    renderPage();
    await screen.findByText('Unit 4 Reading');

    await userEvent.click(screen.getByRole('button', { name: 'Start test' }));

    expect(await screen.findByText('Enter your username.')).toBeInTheDocument();
    expect(api.start).not.toHaveBeenCalled();
  });

  it('trims the username before sending it', async () => {
    api.start.mockResolvedValue({ submission: { submission_id: 55 }, access_token: 'secret', student: {} });
    renderPage();
    await screen.findByText('Unit 4 Reading');

    await userEvent.type(screen.getByLabelText('Your username'), '  ada  ');
    await userEvent.click(screen.getByRole('button', { name: 'Start test' }));

    await waitFor(() => expect(api.start).toHaveBeenCalledWith('token-abc', 'ada', undefined));
  });

  it('shows the refusal when the test was never assigned to that username', async () => {
    api.start.mockRejectedValue(refusal('This test has not been assigned to that username.'));
    renderPage();
    await screen.findByText('Unit 4 Reading');

    await userEvent.type(screen.getByLabelText('Your username'), 'ghost');
    await userEvent.click(screen.getByRole('button', { name: 'Start test' }));

    expect(await screen.findByText('This test has not been assigned to that username.')).toBeInTheDocument();
  });

  it('hands over to the take screen once the attempt starts', async () => {
    api.start.mockResolvedValue({ submission: { submission_id: 55 }, access_token: 'secret', student: {} });
    renderPage();
    await screen.findByText('Unit 4 Reading');

    await userEvent.type(screen.getByLabelText('Your username'), 'ada');
    await userEvent.click(screen.getByRole('button', { name: 'Start test' }));

    expect(await screen.findByText('take test screen')).toBeInTheDocument();
  });

  it('asks before starting a repeat attempt', async () => {
    api.start.mockResolvedValue({ needs_confirmation: true, attempts: 1 });
    renderPage();
    await screen.findByText('Unit 4 Reading');

    await userEvent.type(screen.getByLabelText('Your username'), 'ada');
    await userEvent.click(screen.getByRole('button', { name: 'Start test' }));

    expect(await screen.findByText(/already attempted this test once/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start again' })).toBeInTheDocument();
  });

  it('creates nothing when the student backs out of the repeat attempt', async () => {
    api.start.mockResolvedValue({ needs_confirmation: true, attempts: 2 });
    renderPage();
    await screen.findByText('Unit 4 Reading');

    await userEvent.type(screen.getByLabelText('Your username'), 'ada');
    await userEvent.click(screen.getByRole('button', { name: 'Start test' }));
    await screen.findByText(/already attempted this test 2 times/);

    await userEvent.click(screen.getByRole('button', { name: 'Never mind' }));

    expect(await screen.findByLabelText('Your username')).toBeInTheDocument();
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('confirms the repeat attempt on request', async () => {
    api.start
      .mockResolvedValueOnce({ needs_confirmation: true, attempts: 1 })
      .mockResolvedValueOnce({ submission: { submission_id: 56 }, access_token: 'secret', student: {} });
    renderPage();
    await screen.findByText('Unit 4 Reading');

    await userEvent.type(screen.getByLabelText('Your username'), 'ada');
    await userEvent.click(screen.getByRole('button', { name: 'Start test' }));
    await screen.findByRole('button', { name: 'Start again' });

    await userEvent.click(screen.getByRole('button', { name: 'Start again' }));

    await waitFor(() => expect(api.start).toHaveBeenLastCalledWith('token-abc', 'ada', true));
    expect(await screen.findByText('take test screen')).toBeInTheDocument();
  });
});
