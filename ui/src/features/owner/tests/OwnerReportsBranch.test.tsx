import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/i18n/LanguageContext', () => ({ useLanguage: () => ({ t: (value: string) => value }) }));
vi.mock('../../crm/hooks/useRBAC', () => ({ useRBAC: () => ({ canAccessSubPage: () => true }) }));
vi.mock('../components/OwnerFinancePanel', () => ({ OwnerFinancePanel: () => null }));

const branch = vi.hoisted(() => ({ id: 1 as number | null }));
vi.mock('@/shared/auth/authStorage', () => ({ getStoredActiveCenterId: () => branch.id }));

const list = () => vi.fn(async () => ({ data: [] }));
const api = vi.hoisted(() => ({}) as Record<string, any>);
vi.mock('../api', () => ({ ownerManagerApi: api }));

import OwnerReports from '../OwnerReports';

describe('owner reports follow the branch picked in the sidebar', () => {
  beforeEach(() => {
    branch.id = 1;
    Object.assign(api, {
      centerSummaries: { getAllAcrossCenters: list() },
      students: { getAll: list(), getAllAcrossCenters: list() },
      teachers: { getAll: list(), getAllAcrossCenters: list() },
      classes: { getAll: list(), getAllAcrossCenters: list() },
      payments: { getAll: list(), getAllAcrossCenters: list() },
    });
  });

  it('loads Moliya for the chosen branch only, and again after a switch', async () => {
    render(<MemoryRouter initialEntries={['/owner/reports?section=finance']}><OwnerReports /></MemoryRouter>);
    await waitFor(() => expect(api.payments.getAll).toHaveBeenCalledWith({ center_id: 1 }));
    expect(api.students.getAll).toHaveBeenCalledWith({ center_id: 1 });
    expect(api.payments.getAllAcrossCenters).not.toHaveBeenCalled();
    expect(api.students.getAllAcrossCenters).not.toHaveBeenCalled();

    branch.id = 2;
    act(() => { window.dispatchEvent(new Event('active-center-changed')); });
    await waitFor(() => expect(api.payments.getAll).toHaveBeenLastCalledWith({ center_id: 2 }));
    expect(api.classes.getAll).toHaveBeenLastCalledWith({ center_id: 2 });
  });
});
