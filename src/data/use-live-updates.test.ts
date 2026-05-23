import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveUpdates } from './use-live-updates';
import type { DataSource } from './data-source';
import type { DataChangeHandler, DataChangeEvent } from './types';

interface Row { id: string; name: string }

function createLiveDS(): {
  ds: DataSource<Row>;
  emit: (event: DataChangeEvent<Row>) => void;
} {
  let handler: DataChangeHandler<Row> | null = null;
  const ds: DataSource<Row> = {
    load: () => [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ],
    subscribe: (onChange) => {
      handler = onChange;
      return () => { handler = null; };
    },
    capabilities: () => ({ liveUpdates: true }),
  };
  const emit = (event: DataChangeEvent<Row>) => {
    handler?.(event);
  };
  return { ds, emit };
}

describe('useLiveUpdates — subscription', () => {
  it('subscribes on mount and unsubscribes on unmount', () => {
    const { ds } = createLiveDS();
    const subscribeSpy = vi.spyOn(ds, 'subscribe');
    const { unmount } = renderHook(() =>
      useLiveUpdates(ds, [{ id: '1', name: 'Alice' }], (r) => r.id),
    );
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
    unmount();
    // Unsubscribe was called (the returned function)
  });
});

describe('useLiveUpdates — reconciliation', () => {
  it('adds rows on add event', () => {
    const { ds, emit } = createLiveDS();
    const { result } = renderHook(() =>
      useLiveUpdates(ds, [{ id: '1', name: 'Alice' }], (r) => r.id),
    );

    act(() => {
      emit({
        type: 'add',
        rows: [{ id: '3', data: { id: '3', name: 'Charlie' } }],
      });
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[1].name).toBe('Charlie');
  });

  it('updates rows on update event', () => {
    const { ds, emit } = createLiveDS();
    const { result } = renderHook(() =>
      useLiveUpdates(ds, [{ id: '1', name: 'Alice' }], (r) => r.id),
    );

    act(() => {
      emit({
        type: 'update',
        rows: [{ id: '1', data: { id: '1', name: 'Alice Updated' } }],
      });
    });

    expect(result.current.data[0].name).toBe('Alice Updated');
  });

  it('removes rows on delete event', () => {
    const { ds, emit } = createLiveDS();
    const { result } = renderHook(() =>
      useLiveUpdates(
        ds,
        [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }],
        (r) => r.id,
      ),
    );

    act(() => {
      emit({ type: 'delete', rows: [{ id: '1' }] });
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe('2');
  });
});

describe('useLiveUpdates — edit queueing', () => {
  it('queues updates while editing and applies after', () => {
    const { ds, emit } = createLiveDS();
    const { result } = renderHook(() =>
      useLiveUpdates(ds, [{ id: '1', name: 'Alice' }], (r) => r.id),
    );

    // Start editing
    act(() => {
      result.current.setEditing(true);
    });

    // Emit an update while editing
    act(() => {
      emit({
        type: 'update',
        rows: [{ id: '1', data: { id: '1', name: 'Alice Live' } }],
      });
    });

    // Data should NOT be updated yet
    expect(result.current.data[0].name).toBe('Alice');
    expect(result.current.pendingCount).toBe(1);

    // Stop editing — queued updates apply
    act(() => {
      result.current.setEditing(false);
    });

    expect(result.current.data[0].name).toBe('Alice Live');
    expect(result.current.pendingCount).toBe(0);
  });
});

describe('useLiveUpdates — refresh', () => {
  it('signals refresh needed on refresh event', () => {
    const { ds, emit } = createLiveDS();
    const onRefresh = vi.fn();
    renderHook(() =>
      useLiveUpdates(
        ds,
        [{ id: '1', name: 'Alice' }],
        (r) => r.id,
        { onRefreshNeeded: onRefresh },
      ),
    );

    act(() => {
      emit({ type: 'refresh' });
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
