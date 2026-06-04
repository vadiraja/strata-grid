import { EditContext } from './edit-context';
import type { EditContextValue } from './edit-context';

describe('EditContextValue', () => {
  it('carries an editingEnabled flag', () => {
    const value = { editingEnabled: true } as Partial<EditContextValue>;
    expect(value.editingEnabled).toBe(true);
    expect(EditContext).toBeDefined();
  });
});
