import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import pagesUiReducer from '../../../slices/pagesUiSlice';
import { useTeacherPortalTab } from '../useTeacherPortalTab';

const Portal = () => {
  const [tab, setTab] = useTeacherPortalTab();
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <span data-testid="tab">{tab}</span>
      <span data-testid="url">{location.search}</span>
      <button onClick={() => setTab('attendance')}>attendance</button>
      <button onClick={() => navigate('/lesson')}>start lesson</button>
    </>
  );
};
const Lesson = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/teacher-portal')}>back to portal</button>;
};

const renderApp = (url: string) => {
  const store = configureStore({ reducer: { pagesUi: pagesUiReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/teacher-portal" element={<Portal />} />
          <Route path="/lesson" element={<Lesson />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('teacher portal tab', () => {
  it('a reload with ?tab opens that tab', () => {
    renderApp('/teacher-portal?tab=classes');
    expect(screen.getByTestId('tab').textContent).toBe('classes');
  });

  it('opens on Overall the first time', () => {
    renderApp('/teacher-portal');
    expect(screen.getByTestId('tab').textContent).toBe('overall');
  });

  it('back from a lesson returns to the tab the teacher was on, as before', () => {
    renderApp('/teacher-portal');
    act(() => screen.getByText('attendance').click());
    expect(screen.getByTestId('url').textContent).toBe('?tab=attendance');
    act(() => screen.getByText('start lesson').click());
    act(() => screen.getByText('back to portal').click());
    expect(screen.getByTestId('tab').textContent).toBe('attendance');
  });
});
