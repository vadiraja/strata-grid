import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BooleanFilterInput } from './BooleanFilterInput';

function Harness({
  initialValue,
  tracker,
}: {
  initialValue?: unknown;
  tracker: { current: unknown };
}) {
  const [value, setValue] = useState<unknown>(initialValue);
  tracker.current = value;
  const column = {
    id: 'isActive',
    getFilterValue: () => value,
    setFilterValue: (v: unknown) => setValue(v),
  };
  return <BooleanFilterInput column={column as any} />;
}

describe('BooleanFilterInput', () => {
  it('renders three radios (Any / Yes / No)', () => {
    const tracker = { current: undefined as unknown };
    render(<Harness tracker={tracker} />);
    expect(screen.getByLabelText('Any')).toBeInTheDocument();
    expect(screen.getByLabelText('Yes')).toBeInTheDocument();
    expect(screen.getByLabelText('No')).toBeInTheDocument();
  });

  it('defaults to Any when no filter is set', () => {
    const tracker = { current: undefined as unknown };
    render(<Harness tracker={tracker} />);
    expect(screen.getByLabelText('Any')).toBeChecked();
    expect(screen.getByLabelText('Yes')).not.toBeChecked();
    expect(screen.getByLabelText('No')).not.toBeChecked();
  });

  it("emits { operator: 'equals', value: true } when Yes is selected", () => {
    const tracker = { current: undefined as unknown };
    render(<Harness tracker={tracker} />);
    fireEvent.click(screen.getByLabelText('Yes'));
    expect(tracker.current).toEqual({ operator: 'equals', value: true });
  });

  it("emits { operator: 'equals', value: false } when No is selected", () => {
    const tracker = { current: undefined as unknown };
    render(<Harness tracker={tracker} />);
    fireEvent.click(screen.getByLabelText('No'));
    expect(tracker.current).toEqual({ operator: 'equals', value: false });
  });

  it('clears the filter when Any is selected', () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness
        initialValue={{ operator: 'equals', value: true }}
        tracker={tracker}
      />,
    );
    fireEvent.click(screen.getByLabelText('Any'));
    expect(tracker.current).toBeUndefined();
  });

  it('restores correct checked state from an existing filter', () => {
    const tracker = { current: undefined as unknown };
    render(
      <Harness
        initialValue={{ operator: 'equals', value: false }}
        tracker={tracker}
      />,
    );
    expect(screen.getByLabelText('No')).toBeChecked();
    expect(screen.getByLabelText('Yes')).not.toBeChecked();
    expect(screen.getByLabelText('Any')).not.toBeChecked();
  });
});
