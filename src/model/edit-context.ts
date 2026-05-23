import { createContext, useContext } from 'react';
import type { EditStateReturn } from './use-edit-state';
import type { EditableConfig } from './types';

export interface EditContextValue {
  /** The edit state hook return value. */
  editState: EditStateReturn;
  /** The grid-level editable configuration. */
  config: EditableConfig;
}

export const EditContext = createContext<EditContextValue | null>(null);

/**
 * Returns the edit context. Returns null when editing is not enabled.
 */
export function useEditContext(): EditContextValue | null {
  return useContext(EditContext);
}
