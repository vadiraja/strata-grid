import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from './ContextMenu';

describe('ContextMenu', () => {
  it('renders items and fires onSelect on click', () => {
    const onSelect = vi.fn();
    render(
      <ContextMenu
        open
        position={{ x: 10, y: 20 }}
        items={[
          { id: 'copy', label: 'Copy', onSelect: () => onSelect('copy') },
          { id: 'paste', label: 'Paste', disabled: true, onSelect: () => onSelect('paste') },
        ]}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Copy'));
    expect(onSelect).toHaveBeenCalledWith('copy');
  });

  it('disabled items do not fire onSelect', () => {
    const onSelect = vi.fn();
    render(
      <ContextMenu
        open
        position={{ x: 10, y: 20 }}
        items={[{ id: 'paste', label: 'Paste', disabled: true, onSelect }]}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Paste'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Escape closes the menu', () => {
    const onClose = vi.fn();
    render(
      <ContextMenu open position={{ x: 0, y: 0 }} items={[{ id: 'a', label: 'A', onSelect: () => {} }]} onClose={onClose} />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when open is false', () => {
    render(
      <ContextMenu open={false} position={{ x: 0, y: 0 }} items={[{ id: 'a', label: 'A', onSelect: () => {} }]} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
