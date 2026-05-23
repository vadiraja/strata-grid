import type { DataChangeEvent } from './types';

/**
 * Reconciles a DataChangeEvent into the current row array.
 *
 * Returns the new row array, or `null` if a full reload is needed (refresh event).
 *
 * @param rows - Current row data
 * @param event - The change event from the data source
 * @param getRowId - Function to extract row id
 * @param getParentId - Optional function to extract parent id (for cascade delete)
 */
export function reconcileChanges<TRow>(
  rows: TRow[],
  event: DataChangeEvent<TRow>,
  getRowId: (row: TRow) => string,
  getParentId?: (row: TRow) => string | null | undefined,
): TRow[] | null {
  switch (event.type) {
    case 'add': {
      if (!event.rows) return rows;
      const newRows = event.rows
        .filter((r) => r.data != null)
        .map((r) => r.data as TRow);
      return [...rows, ...newRows];
    }

    case 'update': {
      if (!event.rows) return rows;
      const updateMap = new Map<string, TRow>();
      for (const r of event.rows) {
        if (r.data != null) {
          updateMap.set(r.id, r.data);
        }
      }
      if (updateMap.size === 0) return rows;

      return rows.map((row) => {
        const updated = updateMap.get(getRowId(row));
        return updated ?? row;
      });
    }

    case 'delete': {
      if (!event.rows) return rows;
      const deleteIds = new Set(event.rows.map((r) => r.id));

      // If we have getParentId, cascade delete children
      if (getParentId) {
        let changed = true;
        while (changed) {
          changed = false;
          for (const row of rows) {
            const id = getRowId(row);
            const parentId = getParentId(row);
            if (parentId && deleteIds.has(parentId) && !deleteIds.has(id)) {
              deleteIds.add(id);
              changed = true;
            }
          }
        }
      }

      return rows.filter((row) => !deleteIds.has(getRowId(row)));
    }

    case 'refresh':
      return null;

    default:
      return rows;
  }
}
