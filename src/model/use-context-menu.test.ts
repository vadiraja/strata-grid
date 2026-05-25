import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContextMenu } from './use-context-menu';

describe('useContextMenu', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => useContextMenu());
    expect(result.current.open).toBe(false);
    expect(result.current.target).toBeNull();
  });

  it('openAt sets target, position, and open=true', () => {
    const { result } = renderHook(() => useContextMenu());
    act(() =>
      result.current.openAt({ kind: 'cell', rowId: 'r1', columnId: 'c1' }, { x: 10, y: 20 }),
    );
    expect(result.current.open).toBe(true);
    expect(result.current.position).toEqual({ x: 10, y: 20 });
    expect(result.current.target).toMatchObject({ kind: 'cell', rowId: 'r1', columnId: 'c1' });
  });

  it('close sets open=false but preserves last target', () => {
    const { result } = renderHook(() => useContextMenu());
    act(() => result.current.openAt({ kind: 'header', columnId: 'a' }, { x: 1, y: 1 }));
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
    expect(result.current.target).toMatchObject({ kind: 'header', columnId: 'a' });
  });
});
