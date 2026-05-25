import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGridKeyboard } from './use-grid-keyboard';

const ev = (key: string, opts: Partial<KeyboardEventInit> = {}) =>
  new KeyboardEvent('keydown', { key, ...opts });

describe('useGridKeyboard — range extension', () => {
  it('Shift+ArrowRight calls onRangeExtend(0, 1)', () => {
    const onRangeExtend = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard({ rowCount: 5, colCount: 5, onRangeExtend }),
    );
    result.current.handleKeyDown(ev('ArrowRight', { shiftKey: true }));
    expect(onRangeExtend).toHaveBeenCalledWith(0, 1);
  });

  it('Shift+ArrowDown calls onRangeExtend(1, 0)', () => {
    const onRangeExtend = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard({ rowCount: 5, colCount: 5, onRangeExtend }),
    );
    result.current.handleKeyDown(ev('ArrowDown', { shiftKey: true }));
    expect(onRangeExtend).toHaveBeenCalledWith(1, 0);
  });

  it('Ctrl+Shift+ArrowDown still calls onReorderDown (precedence)', () => {
    const onRangeExtend = vi.fn();
    const onReorderDown = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard({ rowCount: 5, colCount: 5, onRangeExtend, onReorderDown }),
    );
    result.current.handleKeyDown(ev('ArrowDown', { shiftKey: true, ctrlKey: true }));
    expect(onReorderDown).toHaveBeenCalled();
    expect(onRangeExtend).not.toHaveBeenCalled();
  });

  it('Ctrl+C calls onRangeCopy', () => {
    const onRangeCopy = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard({ rowCount: 5, colCount: 5, onRangeCopy }),
    );
    result.current.handleKeyDown(ev('c', { ctrlKey: true }));
    expect(onRangeCopy).toHaveBeenCalled();
  });

  it('plain c does not call onRangeCopy', () => {
    const onRangeCopy = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard({ rowCount: 5, colCount: 5, onRangeCopy }),
    );
    result.current.handleKeyDown(ev('c'));
    expect(onRangeCopy).not.toHaveBeenCalled();
  });
});
