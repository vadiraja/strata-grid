import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useGridKeyboard, type GridKeyboardOptions } from './use-grid-keyboard';

function options(overrides: Partial<GridKeyboardOptions> = {}): GridKeyboardOptions {
  return {
    rowCount: 5,
    colCount: 4,
    ...overrides,
  };
}

function keydown(key: string, init: KeyboardEventInit = {}) {
  return new KeyboardEvent('keydown', { key, ...init });
}

describe('useGridKeyboard', () => {
  it('starts at the first cell by default', () => {
    const { result } = renderHook(() => useGridKeyboard(options()));
    expect(result.current.activeCell).toEqual([0, 0]);
  });

  it('honors a custom initial cell', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(options({ initialCell: [2, 1] })),
    );
    expect(result.current.activeCell).toEqual([2, 1]);
  });

  it('moves with arrow keys within bounds', () => {
    const { result } = renderHook(() => useGridKeyboard(options()));

    act(() => result.current.handleKeyDown(keydown('ArrowRight')));
    expect(result.current.activeCell).toEqual([0, 1]);

    act(() => result.current.handleKeyDown(keydown('ArrowDown')));
    expect(result.current.activeCell).toEqual([1, 1]);

    act(() => result.current.handleKeyDown(keydown('ArrowLeft')));
    expect(result.current.activeCell).toEqual([1, 0]);

    act(() => result.current.handleKeyDown(keydown('ArrowUp')));
    expect(result.current.activeCell).toEqual([0, 0]);

    act(() => result.current.handleKeyDown(keydown('ArrowLeft')));
    act(() => result.current.handleKeyDown(keydown('ArrowUp')));
    expect(result.current.activeCell).toEqual([0, 0]);
  });

  it('moves with Home, End, Ctrl+Home, and Ctrl+End', () => {
    const { result } = renderHook(() =>
      useGridKeyboard(options({ initialCell: [2, 1] })),
    );

    act(() => result.current.handleKeyDown(keydown('End')));
    expect(result.current.activeCell).toEqual([2, 3]);

    act(() => result.current.handleKeyDown(keydown('Home')));
    expect(result.current.activeCell).toEqual([2, 0]);

    act(() => result.current.handleKeyDown(keydown('End', { ctrlKey: true })));
    expect(result.current.activeCell).toEqual([4, 3]);

    act(() => result.current.handleKeyDown(keydown('Home', { ctrlKey: true })));
    expect(result.current.activeCell).toEqual([0, 0]);
  });

  it('calls expansion and selection handlers from action keys', () => {
    const onExpandToggle = vi.fn();
    const onSelectionToggle = vi.fn();
    const { result } = renderHook(() =>
      useGridKeyboard(
        options({
          initialCell: [1, 0],
          onExpandToggle,
          onSelectionToggle,
          isSelectionColumn: (colIndex) => colIndex === 0,
          isTreeColumn: (colIndex) => colIndex === 1,
        }),
      ),
    );

    act(() => result.current.handleKeyDown(keydown('Enter')));
    expect(onSelectionToggle).toHaveBeenCalledWith(1);

    act(() => result.current.setActiveCell([2, 1]));
    act(() => result.current.handleKeyDown(keydown(' ')));
    expect(onExpandToggle).toHaveBeenCalledWith(2);
  });

  it('clamps programmatic focus to valid bounds', () => {
    const { result } = renderHook(() => useGridKeyboard(options()));
    act(() => result.current.setActiveCell([99, 99]));
    expect(result.current.activeCell).toEqual([4, 3]);
  });
});
