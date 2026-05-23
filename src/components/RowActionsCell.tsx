import { useEffect, useRef, useState } from 'react';
import type { RowAction, RowActionsConfig } from '../model/types';

export interface RowActionsCellProps<TRow> {
  config: RowActionsConfig<TRow>;
  row: TRow;
}

function isVisible<TRow>(action: RowAction<TRow>, row: TRow): boolean {
  return action.visible ? action.visible(row) : true;
}

function isDisabled<TRow>(action: RowAction<TRow>, row: TRow): boolean {
  return action.disabled ? action.disabled(row) : false;
}

/**
 * Renders the per-row actions cell. Supports `inline` (icon buttons) and
 * `menu` (kebab dropdown) displays. Visibility and disabled state are
 * evaluated per row.
 */
export function RowActionsCell<TRow>({ config, row }: RowActionsCellProps<TRow>) {
  const visibleActions = config.actions.filter((a) => isVisible(a, row));
  if (visibleActions.length === 0) return null;

  if (config.display === 'menu') {
    return <MenuActions actions={visibleActions} row={row} />;
  }

  return (
    <div className="strata-row-actions" role="group" aria-label="Row actions">
      {visibleActions.map((a) => (
        <button
          key={a.id}
          type="button"
          className="strata-row-action"
          aria-label={a.label}
          title={a.label}
          disabled={isDisabled(a, row)}
          onClick={(e) => {
            e.stopPropagation();
            a.onClick(row, e);
          }}
        >
          {a.icon ?? a.label}
        </button>
      ))}
    </div>
  );
}

interface MenuActionsProps<TRow> {
  actions: RowAction<TRow>[];
  row: TRow;
}

function MenuActions<TRow>({ actions, row }: MenuActionsProps<TRow>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && wrapperRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="strata-row-actions-menu-wrapper" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="strata-row-actions-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Row actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        ⋮
      </button>
      {open && (
        <ul
          className="strata-row-actions-menu"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((a) => (
            <li key={a.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="strata-row-actions-menu-item"
                disabled={isDisabled(a, row)}
                onClick={(e) => {
                  setOpen(false);
                  a.onClick(row, e);
                }}
              >
                {a.icon && <span className="strata-row-actions-menu-icon">{a.icon}</span>}
                <span>{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
