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
      flows: [
        { id: 'WF-001', label: 'Admin valid login', group: 'Authentication' },
        { id: 'WF-041', label: 'Open Students', group: 'Students' },
      ],
    } });
    api.getE2eStatus.mockResolvedValue({ data: { active: null, recent: [] } });
    api.startE2eRun.mockResolvedValue({ data: {
      runId: 'run-1', flowId: 'WF-001', label: 'Admin valid login', status: 'running',
      startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, durationMs: null, output: 'starting',
    } });
  });

  test('lists allowlisted flows and starts the selected flow', async () => {
    const running = {
      runId: 'run-1', flowId: 'WF-001', label: 'Admin valid login', status: 'running',
      startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, durationMs: null, output: 'starting',
    };
    api.getE2eStatus.mockResolvedValueOnce({ data: { active: null, recent: [] } });
    api.getE2eStatus.mockResolvedValue({ data: { active: running, recent: [] } });
    const user = userEvent.setup();
    render(<EngineeringE2eTab />);

    expect(await screen.findByText('E2E Flows')).toBeInTheDocument();
    expect(screen.getByText('Database: crm_frontend_e2e_test')).toBeInTheDocument();
    expect(screen.getByText('2 flows')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: /search e2e workflows/i }), 'WF-001');
    expect(screen.queryByRole('button', { name: /WF-041 Open Students/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /WF-001 Admin valid login/i }));

    await waitFor(() => expect(api.startE2eRun).toHaveBeenCalledWith('WF-001'));
    expect(await screen.findByText(/WF-001: Admin valid login/)).toBeInTheDocument();
  });

});
