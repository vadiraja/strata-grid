import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DateFilterInput } from './DateFilterInput';
import type { FilterOperator } from '../data/types';

function Harness({
  initialValue,
  operators,
  range,
  tracker,
}: {
  initialValue?: unknown;
  operators: FilterOperator[];
  range: boolean;
  tracker: { current: unknown };
}) {
  const [value, setValue] = useState<unknown>(initialValue);
  tracker.current = value;
  const column = {
    id: 'createdAt',
    getFilterValue: () => value,
    setFilterValue: (v: unknown) => setValue(v),
  };
  return (
    <DateFilterInput
      column={column as any}
      operators={operators}
      range={range}
    />
  );
}

describe('DateFilterInput — single date', () => {
  it('renders a single date input', () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness operators={['equals']} range={false} tracker={tracker} />,
    );
    expect(screen.getByLabelText('Filter createdAt')).toBeInTheDocument();
  });

  it("emits { operator, value } when a date is picked", () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness operators={['equals']} range={false} tracker={tracker} />,
    );
    fireEvent.change(screen.getByLabelText('Filter createdAt'), {
      target: { value: '2026-02-15' },
    });
    expect(tracker.current).toEqual({
      operator: 'equals',
      value: '2026-02-15',
    });
  });

  it('clears the filter when the date is cleared', () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness
        initialValue={{ operator: 'equals', value: '2026-02-15' }}
        operators={['equals']}
        range={false}
        tracker={tracker}
      />,
    );
    fireEvent.change(screen.getByLabelText('Filter createdAt'), {
      target: { value: '' },
    });
    expect(tracker.current).toBeUndefined();
  });

  it('shows an operator selector when more than one operator is allowed', () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness
        operators={['equals', 'greaterThan', 'lessThan']}
        range={false}
        tracker={tracker}
      />,
    );
    const opSelect = screen.getByLabelText('Filter createdAt operator');
    expect(opSelect).toBeInTheDocument();
    expect(opSelect).toHaveValue('equals');
  });

  it('re-emits when the operator is changed (with a value present)', () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness
        initialValue={{ operator: 'equals', value: '2026-02-15' }}
        operators={['equals', 'greaterThan']}
        range={false}
        tracker={tracker}
      />,
    );
    fireEvent.change(screen.getByLabelText('Filter createdAt operator'), {
      target: { value: 'greaterThan' },
    });
    expect(tracker.current).toEqual({
      operator: 'greaterThan',
      value: '2026-02-15',
    });
  });
});

describe('DateFilterInput — range', () => {
  it('renders from + to date inputs', () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness operators={['between']} range={true} tracker={tracker} />,
    );
    expect(screen.getByLabelText('Filter createdAt from')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter createdAt to')).toBeInTheDocument();
  });

  it("emits { operator: 'between', value: [from, to] } when both dates are set", () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness operators={['between']} range={true} tracker={tracker} />,
    );
    fireEvent.change(screen.getByLabelText('Filter createdAt from'), {
      target: { value: '2026-01-01' },
    });
    // Only from set — should not emit yet
    expect(tracker.current).toBeUndefined();
    fireEvent.change(screen.getByLabelText('Filter createdAt to'), {
      target: { value: '2026-03-31' },
    });
    expect(tracker.current).toEqual({
      operator: 'between',
      value: ['2026-01-01', '2026-03-31'],
    });
  });

  it('clears the filter when both dates are cleared', () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness
        initialValue={{ operator: 'between', value: ['2026-01-01', '2026-03-31'] }}
        operators={['between']}
        range={true}
        tracker={tracker}
      />,
    );
    fireEvent.change(screen.getByLabelText('Filter createdAt from'), {
      target: { value: '' },
    });
    // Only one of the two cleared — should still hold the previous
    // structured value (component is in mid-edit state).
    expect(tracker.current).toEqual({
      operator: 'between',
      value: ['2026-01-01', '2026-03-31'],
    });
    fireEvent.change(screen.getByLabelText('Filter createdAt to'), {
      target: { value: '' },
    });
    expect(tracker.current).toBeUndefined();
  });
});
