import { fireEvent, render, screen } from '@testing-library/react';
import { RowActionsCell } from './RowActionsCell';
import type { RowActionsConfig } from '../model/types';

interface Row {
  id: string;
  name: string;
  status: 'active' | 'archived';
}

const sampleRow: Row = { id: 'r1', name: 'Alpha', status: 'active' };

describe('RowActionsCell — inline display', () => {
  it('renders one button per action with the label as aria-label', () => {
    const config: RowActionsConfig<Row> = {
      actions: [
        { id: 'view', label: 'View', onClick: () => {} },
        { id: 'edit', label: 'Edit', onClick: () => {} },
      ],
    };
    render(<RowActionsCell config={config} row={sampleRow} />);
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('invokes onClick with the row when clicked', () => {
    const onView = vi.fn();
    const config: RowActionsConfig<Row> = {
      actions: [{ id: 'view', label: 'View', onClick: onView }],
    };
    render(<RowActionsCell config={config} row={sampleRow} />);
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView.mock.calls[0][0]).toEqual(sampleRow);
  });

  it('hides actions whose visible() returns false', () => {
    const config: RowActionsConfig<Row> = {
      actions: [
        { id: 'view', label: 'View', onClick: () => {} },
        {
          id: 'restore',
          label: 'Restore',
          onClick: () => {},
          visible: (r) => r.status === 'archived',
        },
      ],
    };
    render(<RowActionsCell config={config} row={sampleRow} />);
    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull();
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
  });

  it('disables actions whose disabled() returns true', () => {
    const config: RowActionsConfig<Row> = {
      actions: [
        {
          id: 'delete',
          label: 'Delete',
          onClick: () => {},
          disabled: () => true,
        },
      ],
    };
    render(<RowActionsCell config={config} row={sampleRow} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('renders nothing when no actions are visible', () => {
    const config: RowActionsConfig<Row> = {
      actions: [
        { id: 'a', label: 'A', onClick: () => {}, visible: () => false },
      ],
    };
    const { container } = render(<RowActionsCell config={config} row={sampleRow} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('RowActionsCell — menu display', () => {
  const config: RowActionsConfig<Row> = {
    display: 'menu',
    actions: [
      { id: 'view', label: 'View', onClick: () => {} },
      { id: 'edit', label: 'Edit', onClick: () => {} },
    ],
  };

  it('renders a kebab toggle button with aria-haspopup="menu"', () => {
    render(<RowActionsCell config={config} row={sampleRow} />);
    const toggle = screen.getByRole('button', { name: 'Row actions' });
    expect(toggle).toHaveAttribute('aria-haspopup', 'menu');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the menu on click and shows menuitems', () => {
    render(<RowActionsCell config={config} row={sampleRow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Row actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /edit/i })).toBeInTheDocument();
  });

  it('closes the menu and fires onClick when a menuitem is selected', () => {
    const onView = vi.fn();
    const menuConfig: RowActionsConfig<Row> = {
      display: 'menu',
      actions: [{ id: 'view', label: 'View', onClick: onView }],
    };
    render(<RowActionsCell config={menuConfig} row={sampleRow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Row actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /view/i }));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
