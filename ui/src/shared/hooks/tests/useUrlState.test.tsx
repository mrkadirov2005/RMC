import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUrlState } from '../useUrlState';

const Probe = () => {
  const [state, update] = useUrlState({ q: '', status: '', page: '1' });
  const location = useLocation();
  return (
    <>
      <span data-testid="state">{JSON.stringify(state)}</span>
      <span data-testid="url">{location.search}</span>
      <button onClick={() => update({ q: 'ali' })}>search</button>
      <button onClick={() => { update({ status: 'Active' }); update({ page: '3' }); }}>two</button>
      <button onClick={() => update({ q: '', status: '', page: '1' })}>clear</button>
    </>
  );
};

describe('page state in the address', () => {
  it('reads the state back from the address (as after a reload)', () => {
    render(<MemoryRouter initialEntries={['/students?q=gul&page=2']}><Probe /></MemoryRouter>);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toEqual({ q: 'gul', status: '', page: '2' });
  });

  it('two updates at once both stay; defaults leave the address', () => {
    render(<MemoryRouter initialEntries={['/students']}><Probe /></MemoryRouter>);
    act(() => screen.getByText('search').click());
    act(() => screen.getByText('two').click());
    expect(screen.getByTestId('url').textContent).toBe('?q=ali&status=Active&page=3');
    act(() => screen.getByText('clear').click());
    expect(screen.getByTestId('url').textContent).toBe('');
  });
});
