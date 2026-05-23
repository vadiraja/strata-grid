import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ColumnManagementPanel } from './ColumnManagementPanel';

const columns = [
  { id: 'name', header: 'Name' },
  { id: 'age', header: 'Age' },
  { id: 'city', header: 'City' },
];

describe('ColumnManagementPanel', () => {
  it('renders all columns with checkboxes', () => {
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={[]}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('shows hidden columns as unchecked', () => {
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={['age']}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const ageCheckbox = screen.getByLabelText('Toggle Age');
    expect(ageCheckbox).not.toBeChecked();
  });

  it('calls onToggleColumn when checkbox clicked', () => {
    const onToggle = vi.fn();
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={[]}
        onToggleColumn={onToggle}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Toggle Age'));
    expect(onToggle).toHaveBeenCalledWith('age');
  });

  it('disables always-visible columns', () => {
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={[]}
        alwaysVisible={['name']}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Toggle Name')).toBeDisabled();
  });

  it('filters columns by search', () => {
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={[]}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Search columns'), {
      target: { value: 'ag' },
    });
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('calls onReset when reset button clicked', () => {
    const onReset = vi.fn();
    render(
      <ColumnManagementPanel
        columns={columns}
        hiddenColumns={['age']}
        onToggleColumn={vi.fn()}
        onMoveColumn={vi.fn()}
        onReset={onReset}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Reset to default'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
