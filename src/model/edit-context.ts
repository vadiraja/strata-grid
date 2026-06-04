import { createContext, useContext } from 'react';
import type { EditStateReturn } from './use-edit-state';
import type { ColumnDef, EditableConfig } from './types';

export interface EditContextValue {
  /** The edit state hook return value. */
  editState: EditStateReturn;
  /** The grid-level editable configuration. */
  config: EditableConfig;
  /** Whether editing is currently enabled for the grid. */
  editingEnabled: boolean;
  /** Internal: handles a raw lookup result for cascade-fill. Set by DataGrid. */
  onLookupSelect?: (
    rowId: string,
    row: unknown,
    column: ColumnDef<unknown>,
    result: unknown,
  ) => void;
}

export const EditContext = createContext<EditContextValue | null>(null);

/**
 * Returns the edit context. Returns null when editing is not enabled.
 */
export function useEditContext(): EditContextValue | null {
  return useContext(EditContext);
}
