import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  id: string;
  label: string;
  disabled?: boolean;
  divider?: boolean;
  onSelect: () => void;
}

export interface ContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ open, position, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = () => onClose();
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onClick);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="strata-context-menu"
      role="menu"
      style={{ left: position.x, top: position.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item) =>
        item.divider ? (
          <div key={item.id} className="strata-context-menu-divider" role="separator" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className="strata-context-menu-item"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onSelect();
              onClose();
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
