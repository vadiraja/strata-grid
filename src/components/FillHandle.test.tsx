import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FillHandle } from './FillHandle';

describe('FillHandle', () => {
  it('renders nothing when anchorRect is null', () => {
    const { container } = render(<FillHandle anchorRect={null} onFillStart={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('fires onFillStart on pointer down', () => {
    const onFillStart = vi.fn();
    render(
      <FillHandle
        anchorRect={{ left: 100, top: 50, width: 80, height: 24 }}
        onFillStart={onFillStart}
      />,
    );
    fireEvent.pointerDown(screen.getByRole('button'));
    expect(onFillStart).toHaveBeenCalled();
  });

  it('positions itself at the bottom-right of the anchor rect (offset -4)', () => {
    render(
      <FillHandle
        anchorRect={{ left: 100, top: 50, width: 80, height: 24 }}
        onFillStart={vi.fn()}
      />,
    );
    const handle = screen.getByRole('button') as HTMLElement;
    expect(handle.style.left).toBe('176px'); // 100 + 80 - 4
    expect(handle.style.top).toBe('70px');   // 50 + 24 - 4
  });
});
