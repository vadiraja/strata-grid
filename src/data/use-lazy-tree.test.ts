import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLazyTree } from './use-lazy-tree';
import type { DataSource } from './data-source';

interface Row {
  id: string;
  name: string;
  parentId: string | null;
}

const mockChildren: Row[] = [
  { id: 'c1', name: 'Child 1', parentId: 'p1' },
  { id: 'c2', name: 'Child 2', parentId: 'p1' },
];

function createLazyDataSource(
  loadChildrenFn?: DataSource<Row>['loadChildren'],
): DataSource<Row> {
  return {
    load: () => [{ id: 'p1', name: 'Parent', parentId: null }],
    loadChildren: loadChildrenFn ?? vi.fn(() => Promise.resolve(mockChildren)),
    capabilities: () => ({ lazyChildren: true }),
  };
}

describe('useLazyTree — initial state', () => {
  it('starts with no loading nodes', () => {
    const ds = createLazyDataSource();
    const { result } = renderHook(() => useLazyTree(ds));
    expect(result.current.loadingNodes.size).toBe(0);
    expect(result.current.errorNodes.size).toBe(0);
  });

  it('starts with no loaded nodes', () => {
    const ds = createLazyDataSource();
    const { result } = renderHook(() => useLazyTree(ds));
    expect(result.current.isLoaded('p1')).toBe(false);
  });
});

describe('useLazyTree — loadChildren', () => {
  it('loads children for a node', async () => {
    const loadChildrenFn = vi.fn(() => Promise.resolve(mockChildren));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    expect(result.current.loadingNodes.has('p1')).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingNodes.has('p1')).toBe(false);
    });

    expect(result.current.isLoaded('p1')).toBe(true);
    expect(result.current.getChildren('p1')).toEqual(mockChildren);
    expect(loadChildrenFn).toHaveBeenCalledWith('p1', undefined);
  });

  it('deduplicates concurrent requests for the same node', async () => {
    const loadChildrenFn = vi.fn(() => Promise.resolve(mockChildren));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
      result.current.loadNodeChildren('p1');
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    expect(loadChildrenFn).toHaveBeenCalledTimes(1);
  });

  it('does not reload already-loaded nodes', async () => {
    const loadChildrenFn = vi.fn(() => Promise.resolve(mockChildren));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    expect(loadChildrenFn).toHaveBeenCalledTimes(1);
  });
});

describe('useLazyTree — error handling', () => {
  it('tracks error state on failure', async () => {
    const error = new Error('Network error');
    const loadChildrenFn = vi.fn(() => Promise.reject(error));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.loadingNodes.has('p1')).toBe(false);
    });

    expect(result.current.errorNodes.has('p1')).toBe(true);
    expect(result.current.getError('p1')).toBe(error);
    expect(result.current.isLoaded('p1')).toBe(false);
  });

  it('retry clears error and re-fetches', async () => {
    let callCount = 0;
    const loadChildrenFn = vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('fail'));
      return Promise.resolve(mockChildren);
    });
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.errorNodes.has('p1')).toBe(true);
    });

    act(() => {
      result.current.retry('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    expect(result.current.errorNodes.has('p1')).toBe(false);
    expect(result.current.getChildren('p1')).toEqual(mockChildren);
  });
});

describe('useLazyTree — invalidate', () => {
  it('invalidate forces reload on next expand', async () => {
    const loadChildrenFn = vi.fn(() => Promise.resolve(mockChildren));
    const ds = createLazyDataSource(loadChildrenFn);
    const { result } = renderHook(() => useLazyTree(ds));

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    act(() => {
      result.current.invalidate('p1');
    });

    expect(result.current.isLoaded('p1')).toBe(false);

    act(() => {
      result.current.loadNodeChildren('p1');
    });

    await waitFor(() => {
      expect(result.current.isLoaded('p1')).toBe(true);
    });

    expect(loadChildrenFn).toHaveBeenCalledTimes(2);
  });
});
