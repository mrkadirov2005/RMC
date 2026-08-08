import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const api = vi.hoisted(() => ({
  getE2eFlows: vi.fn(),
  getE2eStatus: vi.fn(),
  startE2eRun: vi.fn(),
  cancelE2eRun: vi.fn(),
}));

vi.mock('@/shared/api/api', () => ({ systemAPI: api }));

import EngineeringE2eTab from '../EngineeringE2eTab';

describe('EngineeringE2eTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getE2eFlows.mockResolvedValue({ data: {
      database: 'crm_frontend_e2e_test',
      flows: [{ id: 'E2E-01', label: 'Admin login', group: 'Numbered flows' }],
    } });
    api.getE2eStatus.mockResolvedValue({ data: { active: null, recent: [] } });
    api.startE2eRun.mockResolvedValue({ data: {
      runId: 'run-1', flowId: 'E2E-01', label: 'Admin login', status: 'running',
      startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, durationMs: null, output: 'starting',
    } });
  });

  test('lists allowlisted flows and starts the selected flow', async () => {
    const running = {
      runId: 'run-1', flowId: 'E2E-01', label: 'Admin login', status: 'running',
      startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, durationMs: null, output: 'starting',
    };
    api.getE2eStatus.mockResolvedValueOnce({ data: { active: null, recent: [] } });
    api.getE2eStatus.mockResolvedValue({ data: { active: running, recent: [] } });
    const user = userEvent.setup();
    render(<EngineeringE2eTab />);

    expect(await screen.findByText('E2E Flows')).toBeInTheDocument();
    expect(screen.getByText('Database: crm_frontend_e2e_test')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /E2E-01 Admin login/i }));

    await waitFor(() => expect(api.startE2eRun).toHaveBeenCalledWith('E2E-01'));
    expect(await screen.findByText(/E2E-01: Admin login/)).toBeInTheDocument();
  });

});
