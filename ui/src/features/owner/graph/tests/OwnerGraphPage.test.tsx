import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import OwnerGraphPage from '../OwnerGraphPage';

const api = vi.hoisted(() => ({
  loadCenters: vi.fn(),
  loadTeachers: vi.fn(),
  loadStudents: vi.fn(),
  loadTabData: vi.fn(),
}));
vi.mock('../graphApi', async () => {
  const model = await vi.importActual<typeof import('../graphModel')>('../graphModel');
  return {
    ...api,
    studentTabNodes: (parent: any) => model.STUDENT_TABS.map((tab) => ({ id: `${parent.id}:${tab.id}`, kind: 'tab', label: tab.label, expandable: true, ref: { ...parent.ref, tab: tab.id } })),
  };
});

beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.stubGlobal('DOMMatrixReadOnly', class { m22 = 1; constructor() {} });
});

const node = (id: string, kind: string, label: string, expandable = true) => ({ id, kind, label, expandable, ref: { centerId: 1, teacherId: 5, studentId: 9 } });

describe('OwnerGraphPage', () => {
  it('opens centers, then teachers, students, a student tab and its data', async () => {
    api.loadCenters.mockResolvedValue([node('center:1', 'center', 'Main Center')]);
    api.loadTeachers.mockResolvedValue([node('teacher:5', 'teacher', 'Aziza Karimova')]);
    api.loadStudents.mockResolvedValue([node('student:5:9', 'student', 'Bobur Aliyev')]);
    api.loadTabData.mockResolvedValue([node('student:5:9:payments:0', 'item', '300,000 UZS', false)]);
    render(<OwnerGraphPage />);

    fireEvent.click(await screen.findByText('Main Center'));
    fireEvent.click(await screen.findByText('Aziza Karimova'));
    fireEvent.click(await screen.findByText('Bobur Aliyev'));
    expect(await screen.findByText('Payments')).toBeTruthy();
    expect(screen.getByText('Overview')).toBeTruthy();
    fireEvent.click(screen.getByText('Payments'));
    expect(await screen.findByText('300,000 UZS')).toBeTruthy();
    expect(api.loadTeachers).toHaveBeenCalledWith(1);
    expect(api.loadStudents).toHaveBeenCalledWith(1, 5);

    // Clicking an opened node closes what is below it.
    fireEvent.click(screen.getByText('Aziza Karimova'));
    await waitFor(() => expect(screen.queryByText('Bobur Aliyev')).toBeNull());
  });
});
