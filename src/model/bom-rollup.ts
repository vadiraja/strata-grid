import { devWarn } from './dev-warn';

export interface BomRollupNode {
  id: string;
  qty: unknown;
  children?: BomRollupNode[];
}

export interface ExtendedQtyResult {
  /** Map of row id to computed extended quantity. */
  extendedQuantities: Map<string, number>;
}

export type BomRollupCompute =
  | 'multiply-down'
  | ((parentQty: number, childQty: number) => number);

function normalizeQuantity(rowId: string, qty: unknown): number {
  if (qty == null) {
    devWarn(`BOM roll-up quantity for row "${rowId}" is nullish; using 0.`);
    return 0;
  }

  const numeric = typeof qty === 'number' ? qty : Number(qty);
  if (!Number.isFinite(numeric)) {
    devWarn(`BOM roll-up quantity for row "${rowId}" is not numeric; using 0.`);
    return 0;
  }

  return numeric;
}

function applyCompute(
  compute: BomRollupCompute,
  parentExtQty: number,
  componentQty: number,
): number {
  if (compute === 'multiply-down') {
    return parentExtQty * componentQty;
  }
  return compute(parentExtQty, componentQty);
}

/**
 * Computes extended quantities for a BOM tree.
 *
 * Extended quantity = parent's extended quantity multiplied by this row's
 * component quantity. Each root starts with parent quantity 1.
 */
export function computeExtendedQuantity(
  roots: BomRollupNode[],
  compute: BomRollupCompute = 'multiply-down',
): ExtendedQtyResult {
  const extendedQuantities = new Map<string, number>();

  const visit = (node: BomRollupNode, parentExtQty: number) => {
    const componentQty = normalizeQuantity(node.id, node.qty);
    const extendedQty = applyCompute(compute, parentExtQty, componentQty);
    extendedQuantities.set(node.id, extendedQty);

    for (const child of node.children ?? []) {
      visit(child, extendedQty);
    }
  };

  for (const root of roots) {
    visit(root, 1);
  }

  return { extendedQuantities };
}
