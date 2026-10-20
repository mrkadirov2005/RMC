import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUrlTab } from '../useUrlTab';

const Probe = () => {
  const [tab, setTab] = useUrlTab('overview', ['overview', 'payments', 'groups'] as const);
  const location = useLocation();
  return (
    <>
      <span data-testid="tab">{tab}</span>
      <span data-testid="url">{location.search}</span>
      <button onClick={() => setTab('payments')}>payments</button>
      <button onClick={() => setTab('overview')}>overview</button>
    </>
  );
};

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><Probe /></MemoryRouter>);

describe('tab in the address', () => {
  it('opens the tab named in the address (as after a reload)', () => {
    renderAt('/students/5/profile?tab=groups');
    expect(screen.getByTestId('tab').textContent).toBe('groups');
  });

  it('falls back to the default for a missing or unknown tab', () => {
    renderAt('/students/5/profile?tab=nope');
    expect(screen.getByTestId('tab').textContent).toBe('overview');
  });

  it('writes the tab to the address, keeps other values, and drops it for the default', () => {
    renderAt('/students?page=3');
    act(() => screen.getByText('payments').click());
    expect(screen.getByTestId('url').textContent).toBe('?page=3&tab=payments');
    act(() => screen.getByText('overview').click());
    expect(screen.getByTestId('url').textContent).toBe('?page=3');
  });

  it('can keep the default in the address too', () => {
    const Keep = () => {
      const [, setTab] = useUrlTab('overview', ['overview', 'payments'] as const, 'tab', { keepDefault: true });
      const location = useLocation();
      return (<><span data-testid="url">{location.search}</span><button onClick={() => setTab('overview')}>overview</button></>);
    };
    render(<MemoryRouter initialEntries={['/x?tab=payments']}><Keep /></MemoryRouter>);
    act(() => screen.getByText('overview').click());
    expect(screen.getByTestId('url').textContent).toBe('?tab=overview');
  });
});
