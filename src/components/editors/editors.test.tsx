import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextEditor } from './TextEditor';
import { NumberEditor } from './NumberEditor';
import { SelectEditor } from './SelectEditor';
import { DateEditor } from './DateEditor';
import { CheckboxEditor } from './CheckboxEditor';

describe('TextEditor', () => {
  it('focuses and selects text on mount', () => {
    render(
      <TextEditor
        value="Alpha"
        onChange={vi.fn()}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toBe(document.activeElement);
    expect(screen.getByDisplayValue('Alpha')).toBeInTheDocument();
  });

  it('changes, commits, and discards', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const onDiscard = vi.fn();
    render(
      <TextEditor
        value=""
        onChange={onChange}
        onCommit={onCommit}
        onDiscard={onDiscard}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Beta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onChange).toHaveBeenCalledWith('Beta');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});

describe('NumberEditor', () => {
  it('parses numbers and empty values', () => {
    const onChange = vi.fn();
    render(
      <NumberEditor
        value={42}
        onChange={onChange}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    const input = screen.getByRole('spinbutton');
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '99.5' } });
    fireEvent.change(input, { target: { value: '' } });

    expect(onChange).toHaveBeenNthCalledWith(1, 99.5);
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });
});

describe('SelectEditor', () => {
  it('renders choices and preserves the selected value type', () => {
    const onChange = vi.fn();
    render(
      <SelectEditor
        value={2}
        choices={[
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ]}
        onChange={onChange}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '0' },
    });

    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(1);
  });
});

describe('DateEditor', () => {
  it('renders and changes an ISO date string', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DateEditor
        value="2026-05-22"
        onChange={onChange}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    const input = container.querySelector('input[type="date"]');
    expect(input).toHaveValue('2026-05-22');
    fireEvent.change(input!, { target: { value: '2026-06-01' } });
    expect(onChange).toHaveBeenCalledWith('2026-06-01');
  });
});

describe('CheckboxEditor', () => {
  it('toggles and commits immediately', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <CheckboxEditor
        value={false}
        onChange={onChange}
        onCommit={onCommit}
        onDiscard={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
