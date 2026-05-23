import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectFilterInput } from './SelectFilterInput';
import type { SelectOption } from '../data/types';

const options: SelectOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Pending', value: 'pending' },
];

/**
 * A test harness that wraps SelectFilterInput in a real React state holder so
 * the component re-renders on each setFilterValue call. Exposes the current
 * value via a tracked-ref for assertions.
 */
function Harness({
  initialValue,
  multi,
  operators,
  tracker,
}: {
  initialValue?: unknown;
  multi: boolean;
  operators: ('equals' | 'notEquals' | 'in' | 'notIn')[];
  tracker: { current: unknown };
}) {
  const [value, setValue] = useState<unknown>(initialValue);
  tracker.current = value;
  const column = {
    id: 'status',
    getFilterValue: () => value,
    setFilterValue: (v: unknown) => setValue(v),
  };
  return (
    <SelectFilterInput
      column={column as any}
      options={options}
      multi={multi}
      operators={operators as any}
    />
  );
}

function makeColumn(initialValue: unknown = undefined) {
  let value: unknown = initialValue;
  return {
    id: 'status',
    getFilterValue: () => value,
    setFilterValue: (v: unknown) => {
      value = typeof v === 'function' ? (v as (old: unknown) => unknown)(value) : v;
    },
    getCurrent: () => value,
  };
}

describe('SelectFilterInput — single-select', () => {
  it('renders an Any option plus all provided options', () => {
    const column = makeColumn();
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={false}
        operators={['equals', 'notEquals']}
      />,
    );
    expect(screen.getByRole('option', { name: 'Any' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Inactive' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pending' })).toBeInTheDocument();
  });

  it("emits { operator: 'equals', value } when a value is picked", () => {
    const column = makeColumn();
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={false}
        operators={['equals', 'notEquals']}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'active' } });
    expect(column.getCurrent()).toEqual({ operator: 'equals', value: 'active' });
  });

  it("uses the first operator in the list as the default", () => {
    const column = makeColumn();
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={false}
        operators={['notEquals', 'equals']}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'active' } });
    expect(column.getCurrent()).toEqual({ operator: 'notEquals', value: 'active' });
  });

  it('clears the filter when Any is selected', () => {
    const column = makeColumn({ operator: 'equals', value: 'active' });
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={false}
        operators={['equals']}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(column.getCurrent()).toBeUndefined();
  });

  it('preserves the original value type (string vs number)', () => {
    const numericOptions: SelectOption<number>[] = [
      { label: 'Low', value: 1 },
      { label: 'High', value: 5 },
    ];
    const column = makeColumn();
    render(
      <SelectFilterInput
        column={column as any}
        options={numericOptions}
        multi={false}
        operators={['equals']}
      />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
    const current = column.getCurrent() as { operator: string; value: unknown };
    expect(current.value).toBe(5);
    expect(typeof current.value).toBe('number');
  });
});

describe('SelectFilterInput — multi-select', () => {
  it('renders a checkbox per option', () => {
    const column = makeColumn();
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={true}
        operators={['in', 'notIn']}
      />,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it("emits { operator: 'in', value: [...] } when options toggled on", () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness multi={true} operators={['in', 'notIn']} tracker={tracker} />,
    );
    fireEvent.click(screen.getByLabelText('Active'));
    expect(tracker.current).toEqual({
      operator: 'in',
      value: ['active'],
    });
    fireEvent.click(screen.getByLabelText('Pending'));
    expect(tracker.current).toEqual({
      operator: 'in',
      value: ['active', 'pending'],
    });
  });

  it('removes from the value array when an option is toggled off', () => {
    const column = makeColumn({
      operator: 'in',
      value: ['active', 'pending'],
    });
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={true}
        operators={['in']}
      />,
    );
    fireEvent.click(screen.getByLabelText('Active'));
    expect(column.getCurrent()).toEqual({
      operator: 'in',
      value: ['pending'],
    });
  });

  it('clears the filter when the last selection is removed', () => {
    const column = makeColumn({
      operator: 'in',
      value: ['active'],
    });
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={true}
        operators={['in']}
      />,
    );
    fireEvent.click(screen.getByLabelText('Active'));
    expect(column.getCurrent()).toBeUndefined();
  });

  it('renders a Clear button when at least one value is selected', () => {
    const column = makeColumn({
      operator: 'in',
      value: ['active'],
    });
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={true}
        operators={['in']}
      />,
    );
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('shows a count of selected items in the label', () => {
    const column = makeColumn({
      operator: 'in',
      value: ['active', 'pending'],
    });
    render(
      <SelectFilterInput
        column={column as any}
        options={options}
        multi={true}
        operators={['in']}
      />,
    );
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });
});
