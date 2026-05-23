import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnManagement } from './use-column-management';

const allColumns = [
  { id: 'name', header: 'Name' },
  { id: 'age', header: 'Age' },
  { id: 'city', header: 'City' },
  { id: 'role', header: 'Role' },
];

describe('useColumnManagement — initial state', () => {
  it('starts with all columns visible', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    expect(result.current.visibleColumns).toHaveLength(4);
    expect(result.current.hiddenColumns).toHaveLength(0);
  });

  it('respects initial hidden columns', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns, initialHidden: ['city', 'role'] }),
    );
    expect(result.current.visibleColumns).toHaveLength(2);
    expect(result.current.hiddenColumns).toEqual(['city', 'role']);
  });
});

describe('useColumnManagement — hide/show', () => {
  it('hides a column', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    act(() => { result.current.hideColumn('age'); });
    expect(result.current.hiddenColumns).toContain('age');
    expect(result.current.visibleColumns.find((c) => c.id === 'age')).toBeUndefined();
  });

  it('shows a hidden column', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns, initialHidden: ['age'] }),
    );
    act(() => { result.current.showColumn('age'); });
    expect(result.current.hiddenColumns).not.toContain('age');
  });

  it('prevents hiding the last visible column', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: [{ id: 'name', header: 'Name' }] }),
    );
    act(() => { result.current.hideColumn('name'); });
    // Should still be visible
    expect(result.current.visibleColumns).toHaveLength(1);
  });

  it('respects alwaysVisible columns', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns, alwaysVisible: ['name'] }),
    );
    act(() => { result.current.hideColumn('name'); });
    expect(result.current.visibleColumns.find((c) => c.id === 'name')).toBeDefined();
  });
});

describe('useColumnManagement — reorder', () => {
  it('moves a column to a new position', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    act(() => { result.current.moveColumn('city', 0); });
    expect(result.current.columnOrder[0]).toBe('city');
  });
});

describe('useColumnManagement — reset', () => {
  it('resets to default order and visibility', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    act(() => {
      result.current.hideColumn('age');
      result.current.moveColumn('city', 0);
    });
    act(() => { result.current.reset(); });
    expect(result.current.hiddenColumns).toHaveLength(0);
    expect(result.current.columnOrder).toEqual(['name', 'age', 'city', 'role']);
  });
});

describe('useColumnManagement — search', () => {
  it('filters columns by search term', () => {
    const { result } = renderHook(() =>
      useColumnManagement({ columns: allColumns }),
    );
    const filtered = result.current.searchColumns('ag');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('age');
  });
});
