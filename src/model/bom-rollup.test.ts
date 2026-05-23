import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeExtendedQuantity } from './bom-rollup';

describe('computeExtendedQuantity', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses each root quantity as its extended quantity', () => {
    const result = computeExtendedQuantity([{ id: 'root', qty: 2 }]);
    expect(result.extendedQuantities.get('root')).toBe(2);
  });

  it('multiplies parent extended quantity by child component quantity', () => {
    const result = computeExtendedQuantity([
      {
        id: 'root',
        qty: 2,
        children: [{ id: 'child', qty: 3 }],
      },
    ]);

    expect(result.extendedQuantities.get('root')).toBe(2);
    expect(result.extendedQuantities.get('child')).toBe(6);
  });

  it('cascades through three levels', () => {
    const result = computeExtendedQuantity([
      {
        id: 'root',
        qty: 2,
        children: [
          {
            id: 'child',
            qty: 3,
            children: [{ id: 'grandchild', qty: 4 }],
          },
        ],
      },
    ]);

    expect(result.extendedQuantities.get('grandchild')).toBe(24);
  });

  it('propagates zero quantities down the tree', () => {
    const result = computeExtendedQuantity([
      {
        id: 'root',
        qty: 0,
        children: [{ id: 'child', qty: 3 }],
      },
    ]);

    expect(result.extendedQuantities.get('root')).toBe(0);
    expect(result.extendedQuantities.get('child')).toBe(0);
  });

  it('treats nullish quantities as zero and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = computeExtendedQuantity([
      { id: 'root', qty: undefined, children: [{ id: 'child', qty: 3 }] },
    ]);

    expect(result.extendedQuantities.get('root')).toBe(0);
    expect(result.extendedQuantities.get('child')).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      '[strata] BOM roll-up quantity for row "root" is nullish; using 0.',
    );
  });

  it('starts each root fresh', () => {
    const result = computeExtendedQuantity([
      { id: 'root-a', qty: 2, children: [{ id: 'child-a', qty: 3 }] },
      { id: 'root-b', qty: 5, children: [{ id: 'child-b', qty: 7 }] },
    ]);

    expect(result.extendedQuantities.get('child-a')).toBe(6);
    expect(result.extendedQuantities.get('child-b')).toBe(35);
  });

  it('supports custom compute functions', () => {
    const result = computeExtendedQuantity(
      [{ id: 'root', qty: 2, children: [{ id: 'child', qty: 3 }] }],
      (parentQty, childQty) => parentQty + childQty,
    );

    expect(result.extendedQuantities.get('root')).toBe(3);
    expect(result.extendedQuantities.get('child')).toBe(6);
  });
});
