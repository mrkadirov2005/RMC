import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '../input';

describe('Input', () => {
  it('drops focus on the mouse wheel for number fields, so the value cannot change by scrolling', () => {
    const onWheel = vi.fn();
    render(<Input type="number" aria-label="amount" defaultValue="300000" onWheel={onWheel} />);
    const field = screen.getByLabelText('amount');
    field.focus();
    expect(document.activeElement).toBe(field);
    fireEvent.wheel(field, { deltaY: 100 });
    expect(document.activeElement).not.toBe(field);
    expect((field as HTMLInputElement).value).toBe('300000');
    expect(onWheel).toHaveBeenCalledTimes(1);
  });

  it('leaves text fields focused on the wheel', () => {
    render(<Input type="text" aria-label="name" />);
    const field = screen.getByLabelText('name');
    field.focus();
    fireEvent.wheel(field, { deltaY: 100 });
    expect(document.activeElement).toBe(field);
  });
});
