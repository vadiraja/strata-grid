import { ChevronDown } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { ChevronsLeft } from 'lucide-react';
import { ChevronsRight } from 'lucide-react';
import { ArrowUp } from 'lucide-react';
import { ArrowDown } from 'lucide-react';
import { Filter } from 'lucide-react';
import { ListFilter } from 'lucide-react';
import { Search } from 'lucide-react';
import { Download } from 'lucide-react';
import { Check } from 'lucide-react';
import { X } from 'lucide-react';
import { EyeOff } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Union type of all icon names available in the Strata icon system.
 * Each name maps to a default Lucide icon component in the registry.
 */
export type StrataIconName =
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevrons-left'
  | 'chevrons-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'filter'
  | 'filter-active'
  | 'search'
  | 'download'
  | 'check'
  | 'x'
  | 'eye-off'
  | 'loader-2';

/**
 * Default mapping from StrataIconName to Lucide icon components.
 * Uses direct imports for tree-shaking — only icons used in the bundle are included.
 */
export const DEFAULT_ICON_MAP: Record<StrataIconName, LucideIcon> = {
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  'chevrons-left': ChevronsLeft,
  'chevrons-right': ChevronsRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'filter': Filter,
  'filter-active': ListFilter,
  'search': Search,
  'download': Download,
  'check': Check,
  'x': X,
  'eye-off': EyeOff,
  'loader-2': Loader2,
};
