import { useContext } from 'react';
import { IconContext } from './icon-context';
import { DEFAULT_ICON_MAP } from './icon-registry';
import type { StrataIconName } from './icon-registry';

/**
 * Props for the StrataIcon component.
 */
export interface StrataIconProps {
  /** The icon name from the registry */
  name: StrataIconName;
  /** Accessible label — when set, renders role="img" + aria-label */
  label?: string;
  /** Size override (defaults to token --strata-icon-size) */
  size?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Renders an icon by name, resolving through context overrides then the default
 * Lucide registry. Handles accessibility attributes automatically based on
 * whether a `label` prop is provided.
 */
export function StrataIcon({ name, label, size, className }: StrataIconProps) {
  const { overrides } = useContext(IconContext);

  // Resolve icon: context overrides take priority, then default registry
  const IconComponent = overrides[name] ?? DEFAULT_ICON_MAP[name];

  // Determine ARIA attributes based on label presence
  const ariaProps = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };

  return <IconComponent size={size} className={className} {...ariaProps} />;
}
