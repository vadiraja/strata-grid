import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickSearch } from './use-quick-search';

describe('useQuickSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty search term', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    expect(result.current.term).toBe('');
    expect(result.current.debouncedTerm).toBe('');
  });

  it('updates term immediately', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    act(() => { result.current.setTerm('hello'); });
    expect(result.current.term).toBe('hello');
  });

  it('debounces the search term', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    act(() => { result.current.setTerm('hello'); });
    expect(result.current.debouncedTerm).toBe('');

    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedTerm).toBe('hello');
  });

  it('resets debounce on rapid typing', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    act(() => { result.current.setTerm('h'); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.setTerm('he'); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.setTerm('hel'); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.debouncedTerm).toBe('hel');
  });

  it('clear resets both term and debouncedTerm', () => {
    const { result } = renderHook(() => useQuickSearch({ debounceMs: 300 }));
    act(() => { result.current.setTerm('hello'); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { result.current.clear(); });
    expect(result.current.term).toBe('');
    expect(result.current.debouncedTerm).toBe('');
  });
});
