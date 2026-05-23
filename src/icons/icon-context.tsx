import React, { createContext } from 'react';
import type { StrataIconName } from './icon-registry';

/**
 * Partial mapping of icon names to custom React components.
 * Consumers can override any subset of icons used by the grid.
 */
export type IconOverrides = Partial<
  Record<StrataIconName, React.ComponentType<{ size?: number; className?: string }>>
>;

/**
 * Shape of the icon context value provided to all nested StrataIcon instances.
 */
export interface IconContextValue {
  overrides: IconOverrides;
}

/**
 * React context for icon overrides. Default value has no overrides,
 * so all icons fall back to the default Lucide registry.
 */
export const IconContext = createContext<IconContextValue>({
  overrides: {},
});

/**
 * Provider component that allows consumers to override any icon in the grid.
 * Wrap the DataGrid (or a subtree) with this provider and pass custom components.
 */
export function IconProvider({
  overrides,
  children,
}: {
  overrides: IconOverrides;
  children: React.ReactNode;
}) {
  return (
    <IconContext.Provider value={{ overrides }}>
      {children}
    </IconContext.Provider>
  );
}
