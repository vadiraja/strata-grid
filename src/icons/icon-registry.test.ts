import { describe, it, expect } from 'vitest';
import { DEFAULT_ICON_MAP } from './icon-registry';
import type { StrataIconName } from './icon-registry';

const ALL_ICON_NAMES: StrataIconName[] = [
  'chevron-down',
  'chevron-right',
  'chevron-left',
  'chevrons-left',
  'chevrons-right',
  'arrow-up',
  'arrow-down',
  'filter',
  'filter-active',
  'search',
  'download',
  'check',
  'x',
  'eye-off',
  'loader-2',
];

describe('icon-registry', () => {
  it('has exactly 15 entries in DEFAULT_ICON_MAP', () => {
    expect(Object.keys(DEFAULT_ICON_MAP)).toHaveLength(15);
  });

  it.each(ALL_ICON_NAMES)(
    'has a non-null entry for "%s"',
    (name) => {
      expect(DEFAULT_ICON_MAP[name]).not.toBeNull();
      expect(DEFAULT_ICON_MAP[name]).not.toBeUndefined();
    },
  );

  it.each(ALL_ICON_NAMES)(
    'maps "%s" to a valid React component',
    (name) => {
      const component = DEFAULT_ICON_MAP[name];
      // Lucide icons are React.forwardRef components (objects with $$typeof and render)
      // or plain function components — both are valid
      const isFunction = typeof component === 'function';
      const isForwardRef =
        typeof component === 'object' &&
        component !== null &&
        '$$typeof' in component;
      expect(isFunction || isForwardRef).toBe(true);
    },
  );
});
