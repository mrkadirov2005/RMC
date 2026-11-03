import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: null as any, changePassword: vi.fn() }));

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
vi.mock('../../../crm/hooks', () => ({ useAppSelector: (select: any) => select({ auth: { user: state.user } }) }));
vi.mock('@/shared/api/api', () => ({ ownerAPI: { changePassword: (...args: unknown[]) => state.changePassword(...args) } }));
vi.mock('@/utils/toast', () => ({ showToast: { success: vi.fn(), error: vi.fn() } }));

import { ChangeOwnPasswordCard } from '../ChangeOwnPasswordCard';

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('my password card', () => {
  beforeEach(() => {
    state.changePassword.mockReset().mockResolvedValue({});
  });

  it('is shown to owner accounts only', () => {
    state.user = { id: 3, userType: 'superuser', role: 'admin' };
    const { container } = render(<ChangeOwnPasswordCard />);
    expect(container.innerHTML).toBe('');
  });

  it("changes the signed-in owner's own password, after both new entries match", async () => {
    state.user = { id: 4, userType: 'superuser', role: 'owner', is_developer: true };
    render(<ChangeOwnPasswordCard />);
    const submit = screen.getByRole('button', { name: 'Change password' });

    type('Current password', 'old-password-1');
    type('New password', 'short');
    expect(screen.getByText('At least 8 characters')).toBeTruthy();
    type('New password', 'brand-new-password');
    type('Repeat new password', 'brand-new-passwordX');
    expect(screen.getByText('The new passwords do not match')).toBeTruthy();
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    type('Repeat new password', 'brand-new-password');
    fireEvent.click(submit);
    await waitFor(() => expect(state.changePassword).toHaveBeenCalledWith(4, { old_password: 'old-password-1', new_password: 'brand-new-password' }));
    await waitFor(() => expect((screen.getByLabelText('Current password') as HTMLInputElement).value).toBe(''));
  });
});
